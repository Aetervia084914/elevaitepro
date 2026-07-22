"""
Stage 5 — Result Merge, Deduplication & JSON Response Assembly

- Input: Merged hits from Tier 1/2/3 (Stage 4 output).
- Deduplication: Prefer highest-tier (exact > normalized > fuzzy).
  Overlapping sub-alias hits are resolved (keep longest alias per position).
- Response Model: Pydantic v2 MatchResponse with request_id,
  total_aliases_checked, total_found, found, details, meta.
- Output: Final HTTP 200 JSON response dict.
"""
from __future__ import annotations

import logging
import time
from typing import Any, Optional

import orjson
from pydantic import BaseModel, Field

from app.services.certification_pipeline.schemas import MatchDetail, Stage4Output

logger = logging.getLogger(__name__)

# ── Pydantic Response Models ──

class MatchDetailResponse(BaseModel):
    """Per-alias match detail in the API response."""
    count: int
    match_tier: str
    confidence: float
    positions: list[dict[str, int]]


class MetaResponse(BaseModel):
    """Pipeline metadata in the API response."""
    file_format: str
    pipeline_status: str = "completed"
    processing_ms: int
    stage_count: int = 5
    fuzzy_enabled: bool = False
    normalizations_applied: list[str] = Field(default_factory=list)
    tier1_exact: int = 0
    tier2_normalized: int = 0
    tier3_fuzzy: int = 0


class CertificationMatchedAlias(BaseModel):
    """An alias that matched within a certification."""
    alias: str
    count: int
    match_tier: str
    confidence: float
    positions: list[dict[str, int]]


class CertificationResponse(BaseModel):
    """A certification resolved from matched aliases."""
    cert_id: str
    name: str
    abbreviation: Optional[str] = None
    issuing_body: str
    level: str
    matched_aliases: list[CertificationMatchedAlias] = Field(default_factory=list)


class MatchResponse(BaseModel):
    """Final API response model — validated via Pydantic v2."""
    request_id: str
    total_aliases_checked: int
    total_found: int
    found: list[str]
    details: dict[str, MatchDetailResponse]
    certifications: list[CertificationResponse] = Field(default_factory=list)
    meta: MetaResponse


# ── Deduplication: Remove overlapping sub-alias matches ──

_TIER_PRIORITY = {"exact": 3, "normalized": 2, "fuzzy": 1}


def _deduplicate_overlapping(matches: dict[str, MatchDetail]) -> dict[str, MatchDetail]:
    """
    Remove overlapping sub-alias matches.
    If alias A's positions are a strict subset of alias B's positions
    (i.e. A is a substring of B at the same location), keep only B.
    Example: "Cloud Practitioner" at [2081,2099] overlaps with
    "AWS Cloud Practitioner" at [2077,2099] — keep only the longer one.
    """
    if len(matches) <= 1:
        return matches

    # Collect all (start, end, alias_key, alias_len) tuples
    position_entries: list[tuple[int, int, str, int]] = []
    for key, m in matches.items():
        for pos in m.positions:
            position_entries.append((pos["start"], pos["end"], key, len(m.alias)))

    # Sort by start ascending, then by length descending (longer first)
    position_entries.sort(key=lambda x: (x[0], -x[3]))

    # Find aliases whose ALL positions are subsumed by a longer alias
    subsumed_keys: set[str] = set()

    keys_list = list(matches.keys())
    for i, key_a in enumerate(keys_list):
        m_a = matches[key_a]
        alias_a_lower = m_a.alias.lower()
        for key_b in keys_list[i + 1:]:
            m_b = matches[key_b]
            alias_b_lower = m_b.alias.lower()

            # Check if A is a substring of B or B is a substring of A
            if alias_a_lower in alias_b_lower and alias_a_lower != alias_b_lower:
                # A is a sub-alias of B — check if every A position is covered by a B position
                a_covered = True
                for pa in m_a.positions:
                    covered = any(
                        pb["start"] <= pa["start"] and pb["end"] >= pa["end"]
                        for pb in m_b.positions
                    )
                    if not covered:
                        a_covered = False
                        break
                if a_covered:
                    subsumed_keys.add(key_a)

            elif alias_b_lower in alias_a_lower and alias_a_lower != alias_b_lower:
                # B is a sub-alias of A
                b_covered = True
                for pb in m_b.positions:
                    covered = any(
                        pa["start"] <= pb["start"] and pa["end"] >= pb["end"]
                        for pa in m_a.positions
                    )
                    if not covered:
                        b_covered = False
                        break
                if b_covered:
                    subsumed_keys.add(key_b)

    if subsumed_keys:
        logger.debug("Dedup removed %d sub-alias matches: %s", len(subsumed_keys), subsumed_keys)

    return {k: v for k, v in matches.items() if k not in subsumed_keys}


# ── Build final response dict ──

# ── Fetch certification records from DB ──

async def _fetch_certifications(
    db_pool,
    cert_ids: set[str],
) -> dict[str, dict[str, Any]]:
    """
    Fetch certification records from public.certifications for the given cert_ids.
    Returns dict cert_id -> {name, abbreviation, issuing_body, level}.
    """
    if not cert_ids or not db_pool:
        return {}

    placeholders = ", ".join(["%s"] * len(cert_ids))
    query = (
        f"SELECT id, name, abbreviation, issuing_body, level "
        f"FROM public.certifications WHERE id IN ({placeholders})"
    )

    result: dict[str, dict[str, Any]] = {}
    try:
        async with db_pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(query, list(cert_ids))
                rows = await cur.fetchall()
                for row in rows:
                    result[row[0]] = {
                        "cert_id": row[0],
                        "name": row[1],
                        "abbreviation": row[2],
                        "issuing_body": row[3],
                        "level": row[4],
                    }
    except Exception:
        logger.warning("Failed to fetch certifications for %d cert_ids", len(cert_ids), exc_info=True)

    return result


# ── Build certifications list ──

def _build_certifications_list(
    deduped_matches: dict[str, MatchDetail],
    alias_cert_map: dict[str, str],
    cert_records: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Group matched aliases by their parent certification.
    Returns a list of certification dicts, each with matched_aliases.
    """
    # Group: cert_id -> list of MatchDetail
    cert_groups: dict[str, list[MatchDetail]] = {}
    for key, m in deduped_matches.items():
        cert_id = alias_cert_map.get(key)
        if not cert_id:
            continue
        cert_groups.setdefault(cert_id, []).append(m)

    certifications: list[dict[str, Any]] = []
    for cert_id, matches in sorted(cert_groups.items()):
        cert_info = cert_records.get(cert_id, {})
        if not cert_info:
            # Cert not found in DB — still include with basic info
            cert_info = {"cert_id": cert_id, "name": cert_id, "abbreviation": None, "issuing_body": "Unknown", "level": "unknown"}

        matched_aliases = [
            {
                "alias": m.alias_original,
                "count": m.count,
                "match_tier": m.match_tier,
                "confidence": m.confidence,
                "positions": m.positions,
            }
            for m in sorted(matches, key=lambda x: x.alias_original)
        ]

        certifications.append({
            **cert_info,
            "matched_aliases": matched_aliases,
        })

    return certifications


def _build_response_dict(
    request_id: str,
    s1_meta: dict[str, Any],
    s2_meta: dict[str, Any],
    s3_meta: dict[str, Any],
    s4: Stage4Output,
    deduped_matches: dict[str, MatchDetail],
    certifications: list[dict[str, Any]],
    fuzzy_enabled: bool,
    processing_ms: int,
) -> dict[str, Any]:
    """Assemble the final API response dict matching the architecture spec."""
    found_list = sorted([m.alias_original for m in deduped_matches.values()])
    total_found = len(certifications)

    details = {
        m.alias_original: {
            "count": m.count,
            "match_tier": m.match_tier,
            "confidence": m.confidence,
            "positions": m.positions,
        }
        for m in deduped_matches.values()
    }

    return {
        "request_id": request_id,
        "total_aliases_checked": s3_meta.get("deduped_alias_count", 0),
        "total_found": total_found,
        "found": sorted(set(c["name"] for c in certifications)),
        "details": details,
        "certifications": certifications,
        "meta": {
            "file_format": s1_meta.get("file_format", "unknown"),
            "pipeline_status": "completed",
            "processing_ms": processing_ms,
            "stage_count": 5,
            "fuzzy_enabled": fuzzy_enabled,
            "normalizations_applied": s2_meta.get("normalizations_applied", []),
            "tier1_exact": s4.stageoutput.get("tier1_exact_count", 0),
            "tier2_normalized": s4.stageoutput.get("tier2_normalized_count", 0),
            "tier3_fuzzy": s4.stageoutput.get("tier3_fuzzy_count", 0),
        },
    }


# ── Combined Stage 5 Entry Point ──

async def stage5_assemble(
    request_id: str,
    content_hash: str,
    s1_meta: dict[str, Any],
    s2_meta: dict[str, Any],
    s3_meta: dict[str, Any],
    s4: Stage4Output,
    fuzzy_enabled: bool,
    processing_ms: int,
    alias_cert_map: dict[str, str] | None = None,
    db_pool=None,
) -> dict[str, Any]:
    """
    Stage 5: Result Merge, Deduplication & JSON Response Assembly.

    - Deduplicates overlapping sub-alias matches.
    - Resolves matched aliases to certifications via alias_cert_map + DB lookup.
    - Builds Pydantic-validated response.
    - Returns final response dict.
    """
    t0 = time.perf_counter()

    # Deduplicate overlapping sub-alias matches
    deduped = _deduplicate_overlapping(s4.matches)
    dedup_removed = len(s4.matches) - len(deduped)

    # Resolve matched aliases → cert_ids → certification records
    _cert_map = alias_cert_map or {}
    cert_ids = set()
    for key in deduped:
        cid = _cert_map.get(key)
        if cid:
            cert_ids.add(cid)

    cert_records = await _fetch_certifications(db_pool, cert_ids)
    certifications = _build_certifications_list(deduped, _cert_map, cert_records)

    # Build final response
    response_dict = _build_response_dict(
        request_id=request_id,
        s1_meta=s1_meta,
        s2_meta=s2_meta,
        s3_meta=s3_meta,
        s4=s4,
        deduped_matches=deduped,
        certifications=certifications,
        fuzzy_enabled=fuzzy_enabled,
        processing_ms=processing_ms,
    )

    # Validate with Pydantic (raises on invalid shape)
    validated = MatchResponse(**response_dict)

    stage_ms = (time.perf_counter() - t0) * 1000

    # Attach stage metadata (not part of API response, stored in DB)
    stageoutput: dict[str, Any] = {
        "total_found_before_dedup": s4.total_found,
        "total_found_after_dedup": len(deduped),
        "dedup_removed": dedup_removed,
        "certifications_resolved": len(certifications),
        "cert_ids_looked_up": len(cert_ids),
        "cached_to_redis": False,
        "execution_ms": round(stage_ms, 2),
    }

    logger.info(
        "Stage 5 complete: %d matches -> %d after dedup, %d certifications resolved, %.1fms",
        s4.total_found, len(deduped), len(certifications), stage_ms,
    )

    return {
        "response": response_dict,
        "stageoutput": stageoutput,
    }
