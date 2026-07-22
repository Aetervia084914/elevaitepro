"""GetAnalysis endpoint — deep role analysis (skill gaps, certs, ATS, market intel) via LLM.

Ported from the Next.js route at app/api/GetAnalysis/route.js so the
endpoint is served by the FastAPI backend on port 8002.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Annotated, Any

import httpx

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.api_timing import record_api_time
from app.core.candidate_cache import cache_analysis_role


logger = logging.getLogger(__name__)

router = APIRouter(tags=["analysis"])

# Build LLM proxy URL from settings (LLM_BASE_URL + LLM_ENDPOINT)


# LLM timeout
_LLM_TIMEOUT: int = 180  # analysis is heavier than future-roles


def _resolve_template_path() -> Path:
    """Resolve the master prompt template from a few safe locations."""
    candidates: list[Path] = []

    env_path = os.getenv("MASTER_PROMPT_PATH")
    if env_path:
        candidates.append(Path(env_path).expanduser())

    cwd = Path.cwd()
    candidates.extend([
        cwd / "masterPrompt_Getanalysis.txt",
        cwd / "backend" / "masterPrompt_Getanalysis.txt",
        cwd.parent / "masterPrompt_Getanalysis.txt",
        cwd.parent / "backend" / "masterPrompt_Getanalysis.txt",
    ])

    start_path = Path(__file__).resolve()
    for base in [start_path, *start_path.parents]:
        candidates.extend([
            base / "masterPrompt_Getanalysis.txt",
            base / "backend" / "masterPrompt_Getanalysis.txt",
            base / "app" / "masterPrompt_Getanalysis.txt",
        ])

    for candidate in candidates:
        if candidate.exists():
            return candidate

    raise FileNotFoundError(
        f"Prompt template not found. Checked: {', '.join(str(c) for c in candidates)}"
    )


# ── Request / Response models ─────────────────────────────────────────────────

class SuggestedRole(BaseModel):
    role: str
    whySuggested: str = ""


class AnalysisRequest(BaseModel):
    yearsOfExperience: str = ""
    industry: str = ""
    currentRoles: str = ""
    tools: str = ""
    certifications: str = ""
    skills: str = ""
    suggestedFutureRoles: list[SuggestedRole]
    region: str = "Global"
    comparisonCareerGoals: list[str] = Field(default_factory=list)


class AnalysisResponse(BaseModel):
    success: bool
    rolesCount: int = 0
    roles: list[str] = Field(default_factory=list)
    roleAnalyses: list[dict[str, Any]] = Field(default_factory=list)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_llm_url() -> str:
    """Return the proxy URL used by the Get Analysis FastAPI flow."""
    settings = get_settings()
    base = (settings.llm_base_url or "").rstrip("/")
    endpoint = settings.llm_endpoint or "/openchat"
    if not endpoint.startswith("/"):
        endpoint = "/" + endpoint
    return f"{base}{endpoint}"


def _load_template() -> str:
    """Read the master prompt template and extract the prompt body."""
    template_path = _resolve_template_path()
    content = template_path.read_text(encoding="utf-8")
    # The JS file wraps the prompt in:  const prompt = `...`;
    m = re.search(r"const prompt = `([\s\S]*?)`;", content)
    if not m:
        raise ValueError("Failed to parse masterPrompt template — missing const prompt = `...`;")
    return m.group(1)


def _build_prompt(template: str, req: AnalysisRequest) -> str:
    """Fill placeholders in the prompt template."""
    future_roles_text = "\n".join(
        f"{i+1}. {r.role}{' — ' + r.whySuggested if r.whySuggested else ''}"
        for i, r in enumerate(req.suggestedFutureRoles)
    )
    comparison_text = ", ".join(req.comparisonCareerGoals) if req.comparisonCareerGoals else "None"

    prompt = template
    prompt = prompt.replace("${yearsOfExperience}", req.yearsOfExperience or "Not specified")
    prompt = prompt.replace("${industry}", req.industry or "Not specified")
    prompt = prompt.replace("${currentRoles}", req.currentRoles or "Not specified")
    prompt = prompt.replace("${tools}", req.tools or "Not specified")
    prompt = prompt.replace("${certifications}", req.certifications or "None")
    prompt = prompt.replace("${skills}", req.skills or "Not specified")
    prompt = prompt.replace("${suggestedFutureRoles}", future_roles_text)
    prompt = prompt.replace("${region}", req.region or "Global")
    # Handle the JS template expression for comparisonCareerGoals
    prompt = re.sub(
        r'\$\{comparisonCareerGoals\?\.\s*join\(", "\)\s*\|\|\s*"None"\}',
        comparison_text,
        prompt,
    )
    return prompt


def _strip_code_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z0-9_-]*\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _parse_json_lenient(raw: str) -> dict | None:
    raw = _strip_code_fences(raw)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        repaired = raw
        open_braces = repaired.count("{") - repaired.count("}")
        open_brackets = repaired.count("[") - repaired.count("]")
        if "Unterminated string" in str(repaired):
            repaired += '"'
        repaired += "]" * max(0, open_brackets)
        repaired += "}" * max(0, open_braces)
        return json.loads(repaired)


def _extract_output(response_data: dict) -> dict | None:
    """Extract payload from various LLM response shapes."""
    if "output" in response_data:
        val = response_data["output"]
        out = _parse_json_lenient(val) if isinstance(val, str) else val
    elif response_data.get("choices"):
        try:
            content = response_data["choices"][0]["message"]["content"]
            out = _parse_json_lenient(content) if isinstance(content, str) else content
        except (KeyError, IndexError, TypeError):
            try:
                text = response_data["choices"][0]["text"]
                out = _parse_json_lenient(text) if isinstance(text, str) else text
            except (KeyError, IndexError, TypeError):
                out = response_data
    elif isinstance(response_data, dict):
        out = response_data
    else:
        return None

    # Unwrap { result: ... }
    if isinstance(out, dict) and "result" in out and len(out) <= 2:
        out = out["result"]
        if isinstance(out, str):
            out = _parse_json_lenient(out)

    if not isinstance(out, dict):
        return None

    # Normalize top-level key: LLM may return "reports" instead of "roleAnalyses"
    if "roleAnalyses" not in out and "reports" in out:
        reports = out["reports"]
        if isinstance(reports, list):
            out["roleAnalyses"] = reports

    return out


# ── Response schema sent to the LLM ──────────────────────────────────────────

_ROLE_ANALYSES_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": ["roleAnalyses"],
    "properties": {
        "roleAnalyses": {
            "type": "array",
            "items": {
                "type": "object",
                "required": [
                    "suggestedRole", "whySuggested", "skillGaps", "competencies",
                    "certifications", "atsScore", "marketIntelligence", "careerRoadmap",
                ],
                "properties": {
                    "suggestedRole": {"type": "string"},
                    "whySuggested": {"type": "string"},
                    "skillGaps": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["gap", "description", "category", "priority", "learningPath"],
                            "properties": {
                                "gap": {"type": "string"},
                                "description": {"type": "string"},
                                "category": {"type": "string"},
                                "priority": {"type": "string"},
                                "learningPath": {"type": "string"},
                            },
                        },
                    },
                    "competencies": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["competency", "description", "importance"],
                            "properties": {
                                "competency": {"type": "string"},
                                "description": {"type": "string"},
                                "importance": {"type": "string"},
                                "timeToAcquire": {"type": "string"},
                                "resources": {"type": "array", "items": {"type": "string"}},
                            },
                        },
                    },
                    "certifications": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": [
                                "name", "provider", "description", "difficulty",
                                "duration", "marketValue", "totalDuration", "steps", "flowDiagram",
                            ],
                            "properties": {
                                "name": {"type": "string"},
                                "provider": {"type": "string"},
                                "description": {"type": "string"},
                                "difficulty": {"type": "string"},
                                "duration": {"type": "string"},
                                "marketValue": {"type": "string"},
                                "totalDuration": {"type": "string"},
                                "steps": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "required": ["stepNumber", "title", "description", "duration"],
                                        "properties": {
                                            "stepNumber": {"type": "number"},
                                            "title": {"type": "string"},
                                            "description": {"type": "string"},
                                            "duration": {"type": "string"},
                                            "resources": {"type": "array", "items": {"type": "string"}},
                                            "milestones": {"type": "array", "items": {"type": "string"}},
                                        },
                                    },
                                },
                                "flowDiagram": {"type": "string"},
                            },
                        },
                    },
                    "aiSkills": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["skill", "description", "category", "priority", "learningPath"],
                            "properties": {
                                "skill": {"type": "string"},
                                "description": {"type": "string"},
                                "category": {"type": "string"},
                                "priority": {"type": "string"},
                                "learningPath": {"type": "string"},
                            },
                        },
                    },
                    "fitSummary": {
                        "type": "object",
                        "properties": {
                            "overallFit": {"type": "string"},
                            "seniorityTarget": {"type": "string"},
                            "transitionFeasibility": {"type": "string"},
                            "rationale": {"type": "string"},
                        },
                    },
                    "careerRoadmap": {
                        "type": "object",
                        "required": ["phase1", "phase2", "phase3", "phase4"],
                        "properties": {
                            "phase1": {
                                "type": "array", 
                                "items": {"type": "string"},
                                "minItems": 3,
                                "description": "0-3 months: Foundation & quick wins. MUST contain at least 3 actionable items."
                            },
                            "phase2": {
                                "type": "array", 
                                "items": {"type": "string"},
                                "minItems": 3,
                                "description": "3-6 months: Skill building & certification. MUST contain at least 3 actionable items."
                            },
                            "phase3": {
                                "type": "array", 
                                "items": {"type": "string"},
                                "minItems": 3,
                                "description": "6-12 months: Deepening & specialisation. MUST contain at least 3 actionable items."
                            },
                            "phase4": {
                                "type": "array", 
                                "items": {"type": "string"},
                                "minItems": 3,
                                "description": "12-18 months: Leadership & advancement. MUST contain at least 3 actionable items."
                            },
                        },
                    },
                    "comparisonInfo": {
                        "type": "object",
                        "properties": {
                            "transitionDifficulty": {"type": "string"},
                            "reason": {"type": "string"},
                            "estimatedTransitionDuration": {"type": "string"},
                            "notes": {"type": "array", "items": {"type": "string"}},
                        },
                    },
                    "atsScore": {
                        "type": "object",
                        "required": ["overallScore"],
                        "properties": {
                            "overallScore": {"type": "number"},
                            "skillsScore": {"type": "number"},
                            "competenciesScore": {"type": "number"},
                            "certificationsScore": {"type": "number"},
                            "strengths": {"type": "array", "items": {"type": "string"}},
                            "gaps": {"type": "array", "items": {"type": "string"}},
                            "recommendations": {"type": "array", "items": {"type": "string"}},
                        },
                    },
                    "comparisonMatrix": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "role": {"type": "string"},
                                "score": {"type": "number"},
                                "durationMonths": {"type": "number"},
                                "difficulty": {"type": "string"},
                            },
                        },
                    },
                    "marketIntelligence": {
                        "type": "object",
                        "required": [
                            "demandGrowth", "demandDrivers", "topCities", "medianSalary",
                            "salaryRange", "contractRates", "remoteDemand",
                            "topRemoteHiringRegions", "automationRisk", "automationInsight",
                            "hiringSignals", "topCompanies", "industryMomentum",
                            "futureOutlook", "globalOpportunities", "marketInsight",
                        ],
                        "properties": {
                            "demandGrowth": {"type": "string"},
                            "demandDrivers": {"type": "string"},
                            "topCities": {"type": "array", "items": {"type": "string"}},
                            "medianSalary": {"type": "string"},
                            "salaryRange": {"type": "string"},
                            "contractRates": {"type": "string"},
                            "remoteDemand": {"type": "string"},
                            "topRemoteHiringRegions": {"type": "array", "items": {"type": "string"}},
                            "automationRisk": {"type": "string"},
                            "automationInsight": {"type": "string"},
                            "hiringSignals": {"type": "array", "items": {"type": "string"}},
                            "topCompanies": {"type": "array", "items": {"type": "string"}},
                            "industryMomentum": {"type": "array", "items": {"type": "string"}},
                            "futureOutlook": {"type": "string"},
                            "globalOpportunities": {"type": "array", "items": {"type": "string"}},
                            "marketInsight": {"type": "string"},
                        },
                    },
                },
            },
        },
    },
}


# ── Per-role normalizer ──────────────────────────────────────────────────────

def _to_str_list(val: Any) -> list[str]:
    if isinstance(val, list):
        return [str(v) for v in val if v]
    if isinstance(val, str) and val.strip():
        return [val]
    return []


def _coerce_phase(val: Any) -> list[str]:
    """Coerce a careerRoadmap phase value to a flat list of action strings."""
    if not val:
        return []
    if isinstance(val, list):
        return [str(v) for v in val if v]
    if isinstance(val, dict):
        for key in ("actions", "milestones", "focus"):
            items = val.get(key)
            if isinstance(items, list) and items:
                return [str(i) for i in items if i]
        focus = val.get("focus", "")
        if isinstance(focus, str) and focus.strip():
            return [s.strip() for s in re.split(r"[.;]", focus) if s.strip()]
    if isinstance(val, str) and val.strip():
        return [s.strip() for s in re.split(r"[.;]", val) if s.strip()]
    return []


def _normalize_role(d: dict[str, Any]) -> dict[str, Any]:
    """Normalize raw per-role LLM output to the shape expected by
    ``mapRoleAnalysisToMappedData`` in services.js."""

    # ── atsScore ────────────────────────────────────────────────────────────
    raw_ats = d.get("atsScore") or d.get("atsScoring") or d.get("ats_scoring") or {}
    overall = (raw_ats.get("overallScore") or raw_ats.get("score")
               or raw_ats.get("matchScore")
               or raw_ats.get("currentMatchScore") or 58)
    ats_score = {
        "overallScore": overall,
        "skillsScore": raw_ats.get("skillsScore", overall),
        "competenciesScore": raw_ats.get("competenciesScore", overall),
        "certificationsScore": raw_ats.get("certificationsScore", overall),
        "strengths": _to_str_list(raw_ats.get("strengths")),
        "gaps": _to_str_list(raw_ats.get("gaps")),
        "recommendations": _to_str_list(raw_ats.get("recommendations")),
        "keywordRecommendations": _to_str_list(raw_ats.get("keywordRecommendations")),
    }

    # ── fitSummary ──────────────────────────────────────────────────────────
    raw_fit = (d.get("fitSummary") or d.get("fit_summary")
               or d.get("roleSummary") or d.get("role_summary") or {})
    rationale = raw_fit.get("rationale", "")
    fit_summary = {
        "overallFit": (raw_fit.get("overallFit") or raw_fit.get("overall_fit")
                       or raw_fit.get("fitAssessment") or ""),
        "seniorityTarget": raw_fit.get("seniorityTarget") or raw_fit.get("seniority_target") or "",
        "transitionFeasibility": (raw_fit.get("transitionFeasibility")
                                   or raw_fit.get("transition_feasibility") or ""),
        "rationale": " ".join(rationale) if isinstance(rationale, list) else str(rationale or ""),
    }

    # ── careerRoadmap ───────────────────────────────────────────────────────
    raw_cr = (d.get("careerRoadmap") or d.get("career_roadmap_timeline")
              or d.get("careerRoadmapTimeline") or {})
    phase_keys = [
        (["phase_1_0_3_months", "phase_1_0_to_3_months", "phase1"], "phase1"),
        (["phase_2_3_6_months", "phase_2_3_to_6_months", "phase2"], "phase2"),
        (["phase_3_6_12_months", "phase_3_6_to_12_months", "phase3"], "phase3"),
        (["phase_4_12_18_months", "phase_4_12_plus_months", "phase_4_12_to_18_months", "phase4"], "phase4"),
    ]
    career_roadmap: dict[str, Any] = {}
    for candidates, target in phase_keys:
        for k in candidates:
            val = raw_cr.get(k)
            if val:
                career_roadmap[target] = _coerce_phase(val)
                break
        else:
            career_roadmap[target] = []

    # ── comparisonInfo ──────────────────────────────────────────────────────
    raw_ci = (d.get("comparisonInfo") or d.get("transitionComparison")
              or d.get("transition_comparison") or d.get("comparison") or {})
    raw_diff = (raw_ci.get("transitionDifficulty") or raw_ci.get("transition_difficulty")
                or raw_ci.get("difficulty_assessment") or "")
    comparison_info = {
        "transitionDifficulty": str(raw_diff) if raw_diff else "",
        "reason": raw_ci.get("reason", ""),
        "estimatedTransitionDuration": (
            raw_ci.get("estimatedTransitionDuration")
            or raw_ci.get("estimated_transition_duration") or ""
        ),
        "notes": list(raw_ci.get("notes") or []),
    }

    # ── marketIntelligence ──────────────────────────────────────────────────
    raw_mi = (d.get("marketIntelligence") or d.get("market_intelligence")
              or next((d[k] for k in d if k.startswith("market_intelligence")), {}) or {})
    # demandDrivers may be a list or string
    dd = raw_mi.get("demandDrivers") or raw_mi.get("demand_drivers") or ""
    if isinstance(dd, list):
        dd = ", ".join(str(x) for x in dd)
    # industryMomentum may be a plain string
    im = raw_mi.get("industryMomentum") or raw_mi.get("industry_momentum") or []
    if isinstance(im, str):
        im = [im]
    market_intel = {
        "demandGrowth": raw_mi.get("demandGrowth") or raw_mi.get("demand_growth") or "",
        "demandDrivers": str(dd),
        "topCities": _to_str_list(raw_mi.get("topCities") or raw_mi.get("topHiringCities") or raw_mi.get("top_hiring_cities")),
        "medianSalary": str(raw_mi.get("medianSalary") or raw_mi.get("median_salary") or ""),
        "salaryRange": raw_mi.get("salaryRange") or raw_mi.get("salary_range") or "",
        "contractRates": raw_mi.get("contractRates") or raw_mi.get("contract_rates") or "",
        "remoteDemand": raw_mi.get("remoteDemand") or raw_mi.get("remote_demand") or "",
        "topRemoteHiringRegions": _to_str_list(raw_mi.get("topRemoteHiringRegions") or raw_mi.get("top_remote_hiring_regions")),
        "automationRisk": raw_mi.get("automationRisk") or raw_mi.get("automation_risk") or "",
        "automationInsight": raw_mi.get("automationInsight") or raw_mi.get("automation_insight") or "",
        "hiringSignals": _to_str_list(raw_mi.get("hiringSignals") or raw_mi.get("hiring_signals")),
        "topCompanies": _to_str_list(raw_mi.get("topCompanies") or raw_mi.get("top_companies")),
        "industryMomentum": _to_str_list(im),
        "futureOutlook": raw_mi.get("futureOutlook") or raw_mi.get("future_outlook") or "",
        "globalOpportunities": _to_str_list(raw_mi.get("globalOpportunities") or raw_mi.get("global_opportunities")),
        "marketInsight": raw_mi.get("marketInsight") or raw_mi.get("overallMarketInsight") or raw_mi.get("overall_market_insight") or raw_mi.get("market_insight") or "",
    }

    # ── competencies — may be string[] or object[] ─────────────────────────
    competencies = d.get("competencies") or []
    if not competencies:
        mc = d.get("missingCompetencies") or d.get("missing_competencies") or []
        competencies = [
            {"competency": c, "description": c, "importance": "High"} if isinstance(c, str)
            else c
            for c in mc
        ]

    # ── certifications — handle requiredCertifications shape ───────────────
    certs = d.get("certifications") or []
    if not certs:
        rc = d.get("requiredCertifications") or d.get("required_certifications") or []
        for cert in rc:
            prep = (cert.get("structuredPreparationPath") or cert.get("structured_preparation_path")
                    or cert.get("preparationPath") or {})
            raw_steps = (prep.get("stepByStepProgression") or prep.get("step_by_step_progression")
                         or prep.get("learning_sequence") or prep.get("learningSequence") or [])
            steps = []
            for j, s in enumerate(raw_steps if isinstance(raw_steps, list) else []):
                steps.append({
                    "stepNumber": j + 1,
                    "title": s.get("step", "") if isinstance(s, dict) else str(s),
                    "description": s.get("description", "") if isinstance(s, dict) else str(s),
                    "duration": s.get("duration", "") if isinstance(s, dict) else "",
                    "resources": s.get("resources", []) if isinstance(s, dict) else [],
                    "milestones": s.get("milestones", []) if isinstance(s, dict) else [],
                })
            mv = cert.get("marketValue") or cert.get("valueInUKMarket") or cert.get("value_in_uk_market") or "High"
            # Normalize marketValue to High/Medium/Low
            mv_lower = str(mv).strip().lower()
            if mv_lower.startswith("high"):
                mv = "High"
            elif mv_lower.startswith("medium") or mv_lower.startswith("moderate"):
                mv = "Medium"
            elif mv_lower.startswith("low"):
                mv = "Low"
            else:
                mv = "High"
            total_dur = (prep.get("totalPreparationDuration") or prep.get("total_preparation_duration")
                         or cert.get("totalDuration") or cert.get("duration") or "")
            certs.append({
                "name": cert.get("name") or cert.get("certification_name") or "",
                "provider": cert.get("provider") or "",
                "description": cert.get("description") or cert.get("value_for_role") or cert.get("valueInUKMarket") or "",
                "difficulty": cert.get("difficulty") or "Medium",
                "duration": total_dur,
                "marketValue": mv,
                "totalDuration": total_dur,
                "steps": steps,
                "flowDiagram": (cert.get("flowDiagram") or cert.get("certificationPathwayRoadmap")
                                or cert.get("certification_pathway_roadmap") or ""),
            })

    # ── aiSkills — handle aiSkillsRequired alias ───────────────────────────
    ai_skills = d.get("aiSkills") or d.get("ai_skills") or d.get("aiSkillsRequired") or d.get("ai_skills_required") or []

    return {
        "suggestedRole": d.get("suggestedRole") or d.get("targetRole") or d.get("suggested_role") or d.get("target_role") or "",
        "skillGaps": d.get("skillGaps") or d.get("skill_gaps") or [],
        "aiSkills": ai_skills,
        "competencies": competencies,
        "certifications": certs,
        "atsScore": ats_score,
        "fitSummary": fit_summary,
        "careerRoadmap": career_roadmap,
        "comparisonMatrix": d.get("comparisonMatrix") or d.get("comparison_matrix") or [],
        "comparisonInfo": comparison_info,
        "marketIntelligence": market_intel,
    }


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/GetAnalysis", response_model=AnalysisResponse)
async def get_analysis(
    req: AnalysisRequest,
    x_session_id: Annotated[str | None, Header()] = None,
) -> AnalysisResponse:
    """Deep role analysis: skill gaps, certifications, ATS scores, market intelligence."""
    _t0 = time.perf_counter()

    if not req.suggestedFutureRoles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="suggestedFutureRoles is required",
        )

    # 1 — Build prompt
    try:
        template = _load_template()
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    prompt = _build_prompt(template, req)
    logger.info("[GetAnalysis] Prompt built for %d roles, length=%d", len(req.suggestedFutureRoles), len(prompt))

    # 2 — Call LLM
    settings = get_settings()
    llm_url = _get_llm_url()

    headers: dict[str, str] = {"Content-Type": "application/json"}
    if settings.openai_api_key and settings.openai_api_key != "your-openai-api-key-here":
        headers["Authorization"] = f"Bearer {settings.openai_api_key}"

    body = {
        "prompt": prompt,
        "max_tokens": 8000,
        "temperature": 0,
    }

    async def _call_llm() -> dict:
        async with httpx.AsyncClient(timeout=_LLM_TIMEOUT) as client:
            resp = await client.post(llm_url, json=body, headers=headers)
        if resp.status_code != 200:
            logger.error("[GetAnalysis] LLM API error %d: %s", resp.status_code, resp.text[:500])
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"LLM API call failed ({resp.status_code})",
            )
        return resp.json()

    # Retry once on truncated/malformed response
    last_error: str = ""
    for attempt in range(2):
        try:
            response_data = await _call_llm()
        except httpx.HTTPError as exc:
            logger.error("[GetAnalysis] LLM request failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY, detail="LLM API request failed",
            ) from exc

        # Check for proxy-level JSON repair failure
        result_inner = response_data.get("result", {})
        if isinstance(result_inner, dict) and result_inner.get("error") == "invalid_json_from_model":
            last_error = result_inner.get("parse_error", "unknown")
            logger.warning(
                "[GetAnalysis] Attempt %d: proxy returned invalid_json_from_model (%s) — retrying",
                attempt + 1, last_error,
            )
            continue

        # 3 — Parse response
        data = _extract_output(response_data)
        if data and isinstance(data.get("roleAnalyses"), list):
            break

        last_error = f"roleAnalyses not in response keys: {list((data or {}).keys())}"
        logger.warning("[GetAnalysis] Attempt %d: %s — retrying", attempt + 1, last_error)
    else:
        logger.error("[GetAnalysis] All attempts failed — %s", last_error)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Invalid response: roleAnalyses not found ({last_error})",
        )

    role_analyses: list[dict[str, Any]] = [_normalize_role(ra) for ra in data["roleAnalyses"]]
    logger.info("[GetAnalysis] Received %d role analyses", len(role_analyses))

    cached_roles = [ra.get("suggestedRole", "") for ra in role_analyses if ra.get("suggestedRole")]

    # ── Cache each role analysis into RedisJSON $.Analysis.{RoleName} ───────
    # Build a lookup of whySuggested per role from the request
    _why_map: dict[str, str] = {}
    for sr in req.suggestedFutureRoles:
        _why_map[sr.role.strip()] = sr.whySuggested.strip()

    if x_session_id:
        from app.core.candidate_cache import _resolve_candidate_id
        _cid = _resolve_candidate_id(x_session_id)

        for ra in role_analyses:
            role_name = ra.get("suggestedRole", "")
            if role_name:
                try:
                    cache_analysis_role(x_session_id, role_name, ra)
                except Exception as cache_exc:
                    logger.warning(
                        "[GetAnalysis] RedisJSON cache failed for %s: %s",
                        role_name, cache_exc,
                    )
                # Also persist to role_analyses table with why_suggested
                if _cid:
                    try:
                        from app.api.role_analysis import _upsert_postgres
                        _ws = _why_map.get(role_name, "")
                        await _upsert_postgres(_cid, role_name, req.region, ra, _ws)
                    except Exception as pg_exc:
                        logger.warning(
                            "[GetAnalysis] role_analyses upsert failed for %s: %s",
                            role_name, pg_exc,
                        )

    resp = AnalysisResponse(
        success=True,
        rolesCount=len(role_analyses),
        roles=cached_roles,
        roleAnalyses=role_analyses,
    )

    # Record API timing (fire-and-forget)
    _elapsed_ms = (time.perf_counter() - _t0) * 1000
    asyncio.ensure_future(record_api_time("/GetAnalysis", _elapsed_ms))

    return resp
