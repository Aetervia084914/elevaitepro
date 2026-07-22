"""Resume upload endpoint — parse sections + calculate years of experience."""
from __future__ import annotations

import hashlib
import json
import logging
import time
import uuid
from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, BackgroundTasks, File, Form, Header, HTTPException, Request, Response, UploadFile, status
from pydantic import BaseModel

from app.services.resume_parser.file_validator import validate as validate_file
from app.services.resume_parser.text_extractor import extract_text
from app.services.resume_parser.section_detector import detect_sections
from app.services.resume_parser.experience_calculator import calculate_years
from app.services.resume_parser.contact_extractor import extract_contact_info
from app.services.resume_parser.section_formatter import format_work_experience, format_education
from app.core.api_timing import record_api_time
from app.core.candidate_cache import cache_upload_result
from app.api.routes.getresume_futureroles import predict_future_roles
from app.core.database import get_db
from sqlalchemy import text as sql_text
from sqlalchemy.orm import Session
from typing import Annotated as _Annotated
from fastapi import Depends as _Depends

logger = logging.getLogger(__name__)

router = APIRouter(tags=["resume-upload"])

_CONFIDENCE_THRESHOLD = 6  # out of 10 — map internal 0-1 to 0-10 scale


class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles datetime objects."""
    def default(self, obj: Any) -> Any:
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)



def _build_structured_work_experience(
    experience_section: str, formatted_text: str, full_text: str = "",
) -> dict[str, Any]:
    """Extract structured work experience entries and bundle with formatted text.

    *experience_section* is the raw text of the detected experience section
    (from ``resume_section_patterns.yml``).  *full_text* is the complete resume
    text — passed to ``parse_work_experiences`` only for date-backfilling, NOT
    for section detection.
    """
    try:
        from dataclasses import asdict
        from workexp_extractor.resume_extractor import parse_work_experiences

        entries = parse_work_experiences(experience_section, full_text)
        # Convert datetime objects to ISO format strings for JSON serialization
        entries_list = []
        for e in entries:
            entry_dict = asdict(e)
            if entry_dict.get("start_date"):
                entry_dict["start_date"] = entry_dict["start_date"].isoformat()
            if entry_dict.get("end_date"):
                entry_dict["end_date"] = entry_dict["end_date"].isoformat()
            entries_list.append(entry_dict)
        return {
            "formatted_text": formatted_text,
            "entries": entries_list,
        }
    except Exception as exc:
        logger.warning("Structured work experience extraction failed: %s", exc)
        return {"formatted_text": formatted_text, "entries": []}


# ── Response schema ───────────────────────────────────────────────────────────


class ResumeUploadResponse(BaseModel):
    success: bool
    session_id: str = ""
    raw_text: str
    candidate_name: str = ""
    email: str = ""
    phone: str = ""
    work_experience: str
    education: str
    years_of_experience: float | None
    sections_found: list[str]
    warnings: list[str]
    future_roles: dict[str, Any] | None = None



# ── Stage result persistence (fire-and-forget background task) ────────────────

def _persist_stage_result(
    extraction_type: str,
    status: str,
    result: dict[str, Any] | None,
    error_message: str | None,
    session_token: str | None,
    content_hash: str = "",
    file_size: int = 0,
) -> None:
    """Synchronous DB write run in a background task thread."""
    try:
        from sqlalchemy import text
        from app.db.session import SessionLocal

        session_id = str(uuid.uuid4())
        with SessionLocal() as db:
            # Create parent session row (FK requirement)
            db.execute(
                text(
                    "INSERT INTO sessions (id, content_hash, file_format, file_size_bytes, pipeline_status) "
                    "VALUES (CAST(:sid AS uuid), :hash, 'pdf', :fsize, :status)"
                ),
                {"sid": session_id, "hash": content_hash or session_id, "fsize": file_size, "status": status},
            )
            # Insert stage result
            db.execute(
                text(
                    "INSERT INTO stage_results "
                    "(session_id, stage_number, stage_name, extraction_type, status, stageoutput, error_message) "
                    "VALUES (CAST(:sid AS uuid), 0, 'uploadresume', :etype, :status, CAST(:output AS jsonb), :err)"
                ),
                {
                    "sid": session_id,
                    "etype": extraction_type,
                    "status": status,
                    "output": json.dumps(result, cls=DateTimeEncoder) if result else None,
                    "err": error_message,
                },
            )
            db.commit()
    except Exception as exc:
        logger.warning("Could not persist stage_result: %s", exc)


def _persist_cv_upload(
    session_id: str,
    filename: str,
    content_type: str,
    file_size: int,
    content_hash: str,
    raw_text: str,
    work_experience: dict[str, Any],
    education: dict[str, Any],  # Changed from str to dict to match JSONB structure
    contact_info: dict[str, Any],
    sections: dict[str, str],
    sections_found: list[str],
    warnings: list[str],
    years_of_experience: float | None,
    location: str,
    future_roles_data: dict[str, Any] | None,
    session_token: str | None,
    tools_and_technologies: dict[str, Any] | None = None,
    core_skills: dict[str, Any] | None = None,
    certifications: list[Any] | None = None,
    parsed_output: dict[str, Any] | None = None,
) -> None:
    """Persist CV upload data to user_cv_upload table (background task).

    ``parsed_output`` receives the raw dict returned by the LLM
    (the exact JSON OpenAI sent back, after parsing) stored as-is in the
    ``parsed_output`` JSONB column.
    """
    try:
        from sqlalchemy import text
        from app.db.session import SessionLocal

        candidate_id: str | None = None
        if session_token:
            try:
                with SessionLocal() as db:
                    row = db.execute(
                        text("SELECT user_id FROM usersession WHERE session_token = :token"),
                        {"token": session_token},
                    ).fetchone()
                    if row:
                        candidate_id = str(row[0])
            except Exception as resolve_exc:
                logger.warning("Could not resolve candidate_id from session: %s", resolve_exc)

        with SessionLocal() as db:
            # Safely handle NULL candidate_id and ensure education is properly structured as JSONB
            # (the database column is JSONB, not TEXT as originally defined in migration)
            education_json = json.dumps(education, cls=DateTimeEncoder)
            
            # Extract profile_summary from future_roles_data for dedicated column
            profile_summary = None
            if future_roles_data and isinstance(future_roles_data, dict):
                profile_summary = future_roles_data.get("profile_summary")
            
            params = {
                "session_id": session_id,
                "candidate_id": candidate_id,
                "filename": filename,
                "content_type": content_type,
                "file_size": file_size,
                "content_hash": content_hash,
                "raw_text": raw_text,
                "work_experience": json.dumps(work_experience, cls=DateTimeEncoder),
                "education": education_json,
                "contact_info": json.dumps(contact_info, cls=DateTimeEncoder),
                "sections": json.dumps(sections, cls=DateTimeEncoder),
                "sections_found": json.dumps(sections_found, cls=DateTimeEncoder),
                "warnings": json.dumps(warnings, cls=DateTimeEncoder),
                "years_of_experience": years_of_experience,
                "location": location,
                "profile_summary": profile_summary,  # ← Added profile_summary
                "future_roles_data": json.dumps(future_roles_data, cls=DateTimeEncoder) if future_roles_data else None,
                "tools_and_technologies": json.dumps(tools_and_technologies or {}, cls=DateTimeEncoder),
                "core_skills": json.dumps(core_skills or {}, cls=DateTimeEncoder),
                "certifications": json.dumps(certifications or [], cls=DateTimeEncoder),
                # Raw LLM output stored verbatim — same structure as the response log
                "parsed_output": json.dumps(parsed_output, cls=DateTimeEncoder) if parsed_output else None,
            }
            
            # Build SQL with conditional CAST for candidate_id
            if candidate_id:
                sql = text(
                    """
                    INSERT INTO user_cv_upload (
                        session_id, candidate_id,
                        filename, content_type, file_size, content_hash,
                        raw_text, work_experience, education,
                        contact_info, sections, sections_found, warnings,
                        years_of_experience, location,
                        profile_summary,
                        future_roles_data,
                        tools_and_technologies, core_skills, certifications,
                        parsed_output
                    ) VALUES (
                        :session_id, CAST(:candidate_id AS uuid),
                        :filename, :content_type, :file_size, :content_hash,
                        :raw_text, CAST(:work_experience AS jsonb), CAST(:education AS jsonb),
                        CAST(:contact_info AS jsonb), CAST(:sections AS jsonb),
                        CAST(:sections_found AS jsonb), CAST(:warnings AS jsonb),
                        :years_of_experience, :location,
                        :profile_summary,
                        CAST(:future_roles_data AS jsonb),
                        CAST(:tools_and_technologies AS jsonb),
                        CAST(:core_skills AS jsonb),
                        CAST(:certifications AS jsonb),
                        CAST(:parsed_output AS jsonb)
                    )
                    """
                )
            else:
                sql = text(
                    """
                    INSERT INTO user_cv_upload (
                        session_id,
                        filename, content_type, file_size, content_hash,
                        raw_text, work_experience, education,
                        contact_info, sections, sections_found, warnings,
                        years_of_experience, location,
                        profile_summary,
                        future_roles_data,
                        tools_and_technologies, core_skills, certifications,
                        parsed_output
                    ) VALUES (
                        :session_id,
                        :filename, :content_type, :file_size, :content_hash,
                        :raw_text, CAST(:work_experience AS jsonb), CAST(:education AS jsonb),
                        CAST(:contact_info AS jsonb), CAST(:sections AS jsonb),
                        CAST(:sections_found AS jsonb), CAST(:warnings AS jsonb),
                        :years_of_experience, :location,
                        :profile_summary,
                        CAST(:future_roles_data AS jsonb),
                        CAST(:tools_and_technologies AS jsonb),
                        CAST(:core_skills AS jsonb),
                        CAST(:certifications AS jsonb),
                        CAST(:parsed_output AS jsonb)
                    )
                    """
                )
                params.pop("candidate_id")
            
            db.execute(sql, params)
            db.commit()
        logger.info(
            "[uploadresume] user_cv_upload persisted — session=%s, hash=%s",
            session_id, content_hash[:16],
        )
    except Exception as exc:
        logger.warning("Could not persist user_cv_upload: %s", exc)


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/uploadresume", response_model=ResumeUploadResponse)
async def upload_resume(
    background_tasks: BackgroundTasks,
    request: Request,
    response: Response,
    file: UploadFile = File(...),
    x_session_id: Annotated[str | None, Header()] = None,
    location: Annotated[str, Form()] = "",
    db: _Annotated[Session, _Depends(get_db)] = None,
) -> ResumeUploadResponse:
    """
    Upload a resume (PDF / DOCX / DOC / ODS / TXT, max 10 MB).

    Returns extracted sections, candidate contact info, and years of experience.
    Persists a stage_result row (extraction_type='uploadresume') asynchronously.
    """
    _t0 = time.perf_counter()
    logger.info(
        "[uploadresume] ════════ START ════════ session=%s, location=%r",
        x_session_id or "(none)", location,
    )

    # 0 — Enforce one-CV-per-journey entitlement via userjourney record
    if x_session_id and db is not None:
        try:
            entitlement_row = db.execute(
                sql_text(
                    """
                    SELECT uj.credits_remaining, uj.cv_uploaded
                      FROM usersession us
                      JOIN userjourney uj ON uj.user_id = us.user_id
                     WHERE us.session_token = :token
                     LIMIT 1
                    """
                ),
                {"token": x_session_id},
            ).mappings().first()

            if entitlement_row is not None:
                if entitlement_row["credits_remaining"] <= 0 or entitlement_row["cv_uploaded"]:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=(
                            "No CV upload entitlement remaining for this journey. "
                            "Please complete a new payment to start another analysis."
                        ),
                    )
        except HTTPException:
            raise
        except Exception as check_exc:
            # Non-fatal: log and continue so a missing journey doesn't block upload
            logger.warning("[uploadresume] Entitlement check failed (non-blocking): %s", check_exc)

    # 1 — Read & validate
    file_bytes = await file.read()
    filename = file.filename or "resume"
    content_type = file.content_type or "application/octet-stream"
    logger.info(
        "[uploadresume] Step 1: File received — name=%r, size=%d bytes, content_type=%s",
        filename, len(file_bytes), content_type,
    )

    try:
        validate_file(filename, len(file_bytes))
    except ValueError as exc:
        logger.error("[uploadresume] Step 1 FAILED — validation error: %s", exc)
        background_tasks.add_task(
            _persist_stage_result,
            "uploadresume", "failed", None, str(exc), x_session_id,
        )
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    # 1b — Content hash + session ID
    content_hash = hashlib.sha256(file_bytes).hexdigest()
    session_id = x_session_id or str(uuid.uuid4())
    logger.info(
        "[uploadresume] Step 1b: content_hash=%s, session_id=%s",
        content_hash[:16], session_id,
    )

    # 2 — Extract raw text
    _t2 = time.perf_counter()
    try:
        raw_text = extract_text(file_bytes, filename)
    except ValueError as exc:
        logger.error("[uploadresume] Step 2 FAILED — text extraction error: %s", exc)
        background_tasks.add_task(
            _persist_stage_result,
            "uploadresume", "failed", None, str(exc), x_session_id,
        )
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    logger.info(
        "[uploadresume] Step 2: Text extracted — %d chars in %.0fms",
        len(raw_text), (time.perf_counter() - _t2) * 1000,
    )

    # 3 — Detect sections
    _t3 = time.perf_counter()
    warnings: list[str] = []
    sections = detect_sections(raw_text)
    sections_found = list(sections.keys())
    logger.info(
        "[uploadresume] Step 3: Sections detected — %s in %.0fms",
        sections_found, (time.perf_counter() - _t3) * 1000,
    )

    work_text_raw = sections.get("experience", "")
    education_text_raw = sections.get("education", "")

    # Format sections for clean, structured output
    work_text = format_work_experience(work_text_raw)
    education_text = format_education(education_text_raw)

    # 3a — Extract candidate contact info (name, email, phone)
    _t3a = time.perf_counter()
    contact = extract_contact_info(raw_text, file_name=filename, file_bytes=file_bytes)
    logger.info(
        "[uploadresume] Step 3a: Contact extracted — name=%r, email=%r, phone=%r (%.0fms)",
        contact["name"], contact["email"], contact["phone"],
        (time.perf_counter() - _t3a) * 1000,
    )

    # Validate candidate name
    if not contact["name"].strip():
        err = (
            "No name was found on resume. Please upload a polished resume with your name "
            "clearly visible at the top for better experience."
        )
        logger.error("[uploadresume] VALIDATION FAILED — %s", err)
        background_tasks.add_task(
            _persist_stage_result,
            "uploadresume", "failed", None, err, x_session_id,
        )
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=err)

    # Validate work experience (confidence check: must have content)
    if not work_text.strip():
        err = (
            "Work experience section could not be found or confidence is "
            "too low. Please review your resume and upload again."
        )
        logger.error("[uploadresume] VALIDATION FAILED — %s", err)
        background_tasks.add_task(
            _persist_stage_result,
            "uploadresume", "failed", None, err, x_session_id,
        )
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=err)

    # Validate education
    if not education_text.strip():
        err = (
            "Education section could not be found or confidence is too low. "
            "Please review your resume and upload again."
        )
        logger.error("[uploadresume] VALIDATION FAILED — %s", err)
        background_tasks.add_task(
            _persist_stage_result,
            "uploadresume", "failed", None, err, x_session_id,
        )
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=err)

    # 4 — Calculate years of experience
    _t4 = time.perf_counter()
    years_of_experience: float | None = None
    try:
        years_of_experience = calculate_years(work_text)
    except ValueError:
        years_of_experience = None
        warnings.append("Years of experience could not be determined automatically.")
    logger.info(
        "[uploadresume] Step 4: Years of experience = %s (%.0fms)",
        years_of_experience, (time.perf_counter() - _t4) * 1000,
    )

    # 6 — Build result payload
    result_payload: dict[str, Any] = {
        "sections_found": sections_found,
        "years_of_experience": years_of_experience,
        "warnings": warnings,
    }

    # 7 — Persist stage result (non-blocking)
    background_tasks.add_task(
        _persist_stage_result,
        "uploadresume", "success", result_payload, None, x_session_id,
    )

    # ── Call future-role prediction (Phase 1 + Phase 2) ────────────────────
    _t_llm = time.perf_counter()
    logger.info("[uploadresume] Step 5: Calling LLM future-role prediction (OpenAI proxy)...")
    future_roles_data: dict[str, Any] | None = None
    try:
        future_roles_data = await predict_future_roles(
            raw_text, location.strip(),
        )
        logger.info(
            "[uploadresume] Step 5: LLM prediction OK — %d roles returned in %.0fms",
            len((future_roles_data or {}).get("roles", []) or (future_roles_data or {}).get("all_plausible_future_roles", [])),
            (time.perf_counter() - _t_llm) * 1000,
        )
    except Exception as fr_exc:
        logger.error(
            "[uploadresume] Step 5 FAILED — LLM future-role prediction error after %.0fms: %s",
            (time.perf_counter() - _t_llm) * 1000, fr_exc,
        )
        warnings.append("Future role prediction could not be completed.")

    # ── Persist CV upload data (fire-and-forget background task) ──────────
    # Use structured work experience from LLM if available, otherwise use local parser
    llm_work_exp = future_roles_data.get("work_experience") if future_roles_data else None
    if llm_work_exp and isinstance(llm_work_exp, list) and len(llm_work_exp) > 0:
        # LLM returned structured work experience array - use it!
        structured_work_exp = {
            "formatted_text": work_text,
            "entries": llm_work_exp
        }
        logger.info(
            "[uploadresume] Using LLM work experience — %d entries extracted",
            len(llm_work_exp)
        )
    else:
        # Fallback to local parser if LLM didn't provide work experience
        structured_work_exp = _build_structured_work_experience(work_text_raw, work_text, raw_text)
        logger.info(
            "[uploadresume] Using local parser work experience — %d entries extracted",
            len(structured_work_exp.get("entries", []))
        )
    
    # Use structured education from LLM if available, otherwise fallback to plain text
    structured_education = future_roles_data.get("education") if future_roles_data else None
    if not structured_education or not isinstance(structured_education, list):
        # Fallback: wrap plain text in a simple structure
        structured_education = {
            "formatted_text": education_text,
            "entries": []
        }
    else:
        # LLM returned structured education array - wrap it with formatted text
        structured_education = {
            "formatted_text": education_text,
            "entries": structured_education
        }
    
    background_tasks.add_task(
        _persist_cv_upload,
        session_id=session_id,
        filename=filename,
        content_type=content_type,
        file_size=len(file_bytes),
        content_hash=content_hash,
        raw_text=raw_text,
        work_experience=structured_work_exp,
        education=structured_education,
        contact_info=contact,
        sections=sections,
        sections_found=sections_found,
        warnings=warnings,
        years_of_experience=years_of_experience,
        location=location,
        future_roles_data=future_roles_data,
        session_token=x_session_id,
        tools_and_technologies=future_roles_data.get("tools_and_technologies", {}) if future_roles_data else {},
        core_skills=future_roles_data.get("core_skills", {}) if future_roles_data else {},
        certifications=future_roles_data.get("certifications", []) if future_roles_data else [],
        parsed_output=future_roles_data,  # Raw LLM parsed output stored verbatim
    )

    final_response = ResumeUploadResponse(
        success=True,
        session_id=session_id,
        raw_text=raw_text,
        candidate_name=contact["name"],
        email=contact["email"],
        phone=contact["phone"],
        work_experience=work_text,
        education=education_text,
        years_of_experience=years_of_experience,
        sections_found=sections_found,
        warnings=warnings,
        future_roles=future_roles_data,
    )

    # ── Cache candidate details + future-roles payload in memory (non-blocking) ──
    if x_session_id:
        candidate_details = {
            "name": contact["name"],
            "email": contact["email"],
            "phone": contact["phone"],
            "linkedin": contact.get("linkedin", ""),
            "work_experience": work_text,
            "education": education_text,
            "years_of_experience": years_of_experience,
            "sections_found": sections_found,
        }
        logger.info(
            "[uploadresume] Step 6: CACHE WRITE queued — session=%s, future_roles_present=%s",
            x_session_id,
            bool(future_roles_data),
        )
        background_tasks.add_task(
            cache_upload_result, x_session_id, future_roles_data or {}, candidate_details
        )
    else:
        logger.warning("[uploadresume] Step 6: CACHE SKIPPED — no x-session-id header")

    # Record API timing (fire-and-forget)
    _elapsed_ms = (time.perf_counter() - _t0) * 1000
    background_tasks.add_task(record_api_time, "/uploadresume", _elapsed_ms)

    logger.info(
        "[uploadresume] ════════ DONE ════════ session=%s, candidate=%r, "
        "roles=%d, total=%.0fms",
        session_id,
        contact["name"],
        len((future_roles_data or {}).get("roles", []) or (future_roles_data or {}).get("all_plausible_future_roles", [])),
        _elapsed_ms,
    )

    return final_response
