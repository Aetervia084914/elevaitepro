"""Stage 7 — Industry, Occupation Group & Job Level Profiling."""
from __future__ import annotations

import logging
import math
import re as _re
import time
from collections import Counter, defaultdict
from typing import Any

import numpy as np

from app.schemas.skill_normalizer import (
    IndustryMatch,
    JobLevelResult,
    OccupationDetail,
    OccupationMatch,
    PipelineContext,
    StageStatus,
)

log = logging.getLogger(__name__)

# -- Tuning constants ---------------------------------------------------------

INDUSTRY_TOP_N:   int = 5
OCCUPATION_TOP_N: int = 5

_ONET_MIN_COVERAGE: float = 0.30

_ONET_BANDS: list[tuple[str, float]] = [
    ("lead",   4.2),
    ("senior", 3.4),
    ("mid",    2.2),
    ("entry",  0.0),
]

_LEAD_OCC_TOKENS = frozenset({
    "architect", "architecture", "principal", "staff engineer",
    "director", "vp ", "head of", "chief", "cto", "cio",
})
_SENIOR_OCC_TOKENS = frozenset({
    "senior", "advanced", "expert",
    "team lead", "tech lead", "technical lead",
})

_AREA_BANDS: list[tuple[str, int]] = [
    ("senior", 6),
    ("mid",    3),
    ("entry",  0),
]

# Title-keyword → level mapping (checked in priority order; first match wins).
# Searched in the first 500 chars of the resume (title/header area).

_TITLE_LEVEL_PATTERNS: list[tuple[str, str]] = [
    (r"\b(?:principal|staff|distinguished|fellow)\b",              "lead"),
    (r"\b(?:director|vp|vice\s*president|head\s+of|chief|cto|cio|cfo|coo)\b", "lead"),
    (r"\b(?:lead|manager|team\s*lead|tech\s*lead)\b",             "lead"),
    (r"\b(?:senior|sr\.?|iii)\b",                                 "senior"),
    (r"\b(?:specialist|ii|mid[\-\s]level)\b",                     "mid"),
    (r"\b(?:associate|junior|jr\.?|entry[\-\s]level|intern|trainee|i)\b", "entry"),
]


# -- DB helpers ---------------------------------------------------------------

async def _fetch_industry_rows(
    conn,
    skill_ids: list[int],
) -> list[dict[str, Any]]:
    """Return rows from taxonomy_skill_industry for the given skill_ids."""
    if not skill_ids:
        return []
    cur = await conn.execute(
        """
        SELECT skill_id,
               COALESCE(industry_name, career_area) AS industry_name,
               COALESCE(career_area, industry_name) AS career_area,
               COALESCE(occupation_group, '')        AS occupation_group,
               COALESCE(weight, 1.0)                AS weight
        FROM taxonomy_skill_industry
        WHERE skill_id = ANY(%s)
          AND (industry_name IS NOT NULL OR career_area IS NOT NULL)
        """,
        (skill_ids,),
    )
    rows = await cur.fetchall()
    return [
        {
            "skill_id":         row[0],
            "industry_name":    row[1],
            "career_area":      row[2],
            "occupation_group": row[3],
            "weight":           float(row[4]),
        }
        for row in rows
    ]


async def _fetch_onet_signals(
    conn,
    skill_ids: list[int],
) -> dict[int, dict[str, Any]]:
    """Return {skill_id: {onet_importance, skill_type, skill_category_flags}}."""
    if not skill_ids:
        return {}
    cur = await conn.execute(
        """
        SELECT skill_id,
               COALESCE(onet_importance, 0)          AS onet_importance,
               COALESCE(skill_type, '')               AS skill_type,
               COALESCE(skill_category_flags, '{}')  AS flags
        FROM taxonomy_skills
        WHERE skill_id = ANY(%s)
        """,
        (skill_ids,),
    )
    rows = await cur.fetchall()
    return {
        row[0]: {
            "onet_importance": float(row[1]),
            "skill_type":      row[2],
            "flags":           row[3] if isinstance(row[3], list) else [],
        }
        for row in rows
    }


# -- Lightcast occupation DB helpers ------------------------------------------

async def _fetch_lightcast_occupations(
    conn,
    skill_ids: list[int],
) -> list[dict[str, Any]]:
    """Join taxonomy_skills → skill_occupations → occupations via lightcast_id.

    Returns rows: {taxonomy_skill_id, occupation_id, occupation_name}.
    Gracefully returns [] if Lightcast tables have not been created yet.
    """
    if not skill_ids:
        return []
    try:
        cur = await conn.execute(
            """
            SELECT ts.skill_id   AS taxonomy_skill_id,
                   o.id          AS occupation_id,
                   o.name        AS occupation_name,
                   o.isco_code   AS isco_code
            FROM taxonomy_skills ts
            JOIN skill_occupations so
              ON so.skill_id IN (ts.lightcast_id, ts.skill_id::text)
            JOIN occupations o ON o.id = so.occupation_id
            WHERE ts.skill_id = ANY(%s)
            """,
            (skill_ids,),
        )
        rows = await cur.fetchall()
        return [
            {
                "taxonomy_skill_id": row[0],
                "occupation_id":     row[1],
                "occupation_name":   row[2],
                "isco_code":         row[3] or "",
            }
            for row in rows
        ]
    except Exception:
        log.debug("Lightcast occupation tables not available — skipping nested occupations")
        await conn.rollback()
        return []


async def _fetch_occupation_skill_breadth(
    conn,
    occupation_ids: list[int],
) -> dict[int, int]:
    """Return {occupation_id: total_skill_count} for IDF denominator."""
    if not occupation_ids:
        return {}
    try:
        cur = await conn.execute(
            """
            SELECT occupation_id, COUNT(DISTINCT skill_id) AS skill_count
            FROM skill_occupations
            WHERE occupation_id = ANY(%s)
            GROUP BY occupation_id
            """,
            (occupation_ids,),
        )
        rows = await cur.fetchall()
        return {row[0]: int(row[1]) for row in rows}
    except Exception:
        await conn.rollback()
        return {}


async def _fetch_total_occupation_count(conn) -> int:
    """Return the total number of distinct occupations for IDF calculation."""
    try:
        cur = await conn.execute("SELECT COUNT(*) FROM occupations")
        row = await cur.fetchone()
        return int(row[0]) if row else 1
    except Exception:
        await conn.rollback()
        return 1


# -- ISCO group label cache ---------------------------------------------------

_ISCO_LABELS: dict[str, str] | None = None

def _get_isco_labels() -> dict[str, str]:
    """Return {isco_code: label} from ISCOGroups CSV, cached on first call."""
    global _ISCO_LABELS
    if _ISCO_LABELS is not None:
        return _ISCO_LABELS
    import csv
    from pathlib import Path
    csv_path = Path(__file__).resolve().parents[3] / "data" / "ESCO" / "ISCOGroups_en.csv"
    _ISCO_LABELS = {}
    if csv_path.exists():
        with open(csv_path, "r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                code = (row.get("code") or "").strip()
                label = (row.get("preferredLabel") or "").strip()
                if code and label:
                    _ISCO_LABELS[code] = label
    log.info("ISCO label cache loaded: %d groups", len(_ISCO_LABELS))
    return _ISCO_LABELS


# -- TF-IDF + Softmax confidence helpers -------------------------------------

def _softmax(scores: np.ndarray, temperature: float = 1.0) -> np.ndarray:
    """Numerically stable softmax for converting raw scores to probabilities."""
    if scores.size == 0:
        return scores
    scaled = scores / max(temperature, 1e-9)
    shifted = scaled - np.max(scaled)
    exp_vals = np.exp(shifted)
    return exp_vals / exp_vals.sum()


def _compute_skill_idf(
    skill_ids: list[int],
    occ_rows: list[dict[str, Any]],
    total_occupations: int,
) -> dict[int, float]:
    """IDF = log(N / (1 + df)) where df = number of occupations containing skill.

    Rarer skills get higher IDF → more discriminative.
    """
    skill_doc_freq: Counter[int] = Counter()
    # Count how many occupations each skill appears in
    skill_occ_pairs: set[tuple[int, int]] = set()
    for row in occ_rows:
        skill_occ_pairs.add((row["taxonomy_skill_id"], row["occupation_id"]))
    for sid, _ in skill_occ_pairs:
        skill_doc_freq[sid] += 1

    n = max(total_occupations, 1)
    return {
        sid: math.log(n / (1.0 + skill_doc_freq.get(sid, 0)))
        for sid in skill_ids
    }


# -- Industry name normalisation -----------------------------------------------
# Merges old Lightcast lowercase labels with ISCO major-group labels into
# a clean, user-friendly set.
_INDUSTRY_NORM: dict[str, str] = {
    # Old Lightcast labels
    "it":              "Information Technology",
    "engineering":     "Engineering",
    "finance":         "Finance",
    "business":        "Business & Management",
    "marketing":       "Marketing & Sales",
    "design":          "Design & Creative",
    "hr":              "Human Resources",
    "analysis":        "Data & Analytics",
    "customer":        "Customer Service",
    # New domain-specific labels from ETL enrichment
    "manufacturing":          "Manufacturing",
    "education":              "Education",
    "healthcare":             "Healthcare",
    "logistics & supply chain": "Logistics & Supply Chain",
    "logistics":              "Logistics & Supply Chain",
    # ISCO major-group labels → industry-friendly names
    "managers":                                          "Business & Management",
    "professionals":                                     "Professional Services",
    "technicians and associate professionals":           "Engineering & Technology",
    "clerical support workers":                          "Administrative & Clerical",
    "services and sales workers":                        "Marketing & Sales",
    "service and sales workers":                         "Marketing & Sales",
    "skilled agricultural, forestry and fishery workers": "Agriculture & Environment",
    "craft and related trades workers":                  "Manufacturing & Trades",
    "plant and machine operators and assemblers":        "Manufacturing & Operations",
    "elementary occupations":                            "General Labour",
    "armed forces occupations":                          "Defence & Security",
}


def _norm_industry(raw: str) -> str:
    return _INDUSTRY_NORM.get(raw.strip().lower(), raw.title())


# -- Title → Industry hints ---------------------------------------------------
_TITLE_INDUSTRY_PATTERNS: list[tuple[str, str]] = [
    # (regex_pattern, normalised_industry)
    # -- Domain-specific "data" roles (must precede generic IT data pattern) --
    (r"healthcare\s+data",             "Healthcare"),
    (r"clinical\s+data",               "Healthcare"),
    (r"medical\s+data",                "Healthcare"),
    (r"financial\s+data",              "Finance"),
    # -- IT / Software --
    (r"software\s+(engineer|develop)", "Information Technology"),
    (r"web\s+(develop|engineer|platform)", "Information Technology"),
    (r"backend\s+develop",            "Information Technology"),
    (r"frontend\s+develop",           "Information Technology"),
    (r"full.?stack",                   "Information Technology"),
    (r"data\s+(scien|engineer|analy)", "Information Technology"),
    (r"devops",                        "Information Technology"),
    (r"cloud\s+(engineer|arch)",       "Information Technology"),
    (r"cybersecurity|cyber\s+sec",     "Information Technology"),
    (r"machine\s+learn",              "Information Technology"),
    (r"\bai\s+engineer",              "Information Technology"),
    (r"sre\b|site\s+reliability",     "Information Technology"),
    # -- QA / Testing --
    (r"qa\s+(engineer|lead|manager|analyst|automation)",  "Information Technology"),
    (r"quality\s+assurance\s+(engineer|lead|analyst)",   "Information Technology"),
    (r"test\s+(engineer|lead|manager|automation)",        "Information Technology"),
    (r"sdet\b",                       "Information Technology"),
    (r"automation\s+(engineer|lead)", "Information Technology"),
    # -- Manufacturing --
    (r"manufactur",                   "Manufacturing"),
    (r"industrial\s+engineer",        "Manufacturing"),
    (r"production\s+engineer",        "Manufacturing"),
    (r"quality\s+(engineer|manager)(?!.*(?:assurance|software|qa|test))", "Manufacturing"),
    (r"plant\s+manager",              "Manufacturing"),
    # -- Education --
    (r"instruct",                     "Education"),
    (r"curriculum",                   "Education"),
    (r"\bteach",                      "Education"),
    (r"\beducat",                     "Education"),
    (r"k-?12",                        "Education"),
    # -- Marketing --
    (r"marketing",                    "Marketing & Sales"),
    (r"brand\s+(manager|director)",   "Marketing & Sales"),
    (r"\bsales\b",                    "Marketing & Sales"),
    # -- Healthcare --
    (r"healthcare",                   "Healthcare"),
    (r"\bnurs",                       "Healthcare"),
    (r"medical",                      "Healthcare"),
    (r"clinical",                     "Healthcare"),
    (r"pharma",                       "Healthcare"),
    # -- HR --
    (r"\bhr\b|human\s+resource",      "Human Resources"),
    (r"recruit",                      "Human Resources"),
    (r"talent\s+acqui",              "Human Resources"),
    # -- Logistics --
    (r"logistic",                     "Logistics & Supply Chain"),
    (r"supply\s+chain",              "Logistics & Supply Chain"),
    (r"transport",                    "Logistics & Supply Chain"),
    (r"wareho",                       "Logistics & Supply Chain"),
    # -- Finance --
    (r"financ",                       "Finance"),
    (r"account",                      "Finance"),
]


def _detect_title_industry(raw_text: str | None) -> str | None:
    """Detect industry hint from the first 500 chars of resume text."""
    if not raw_text:
        return None
    header = raw_text[:500].lower()
    for pattern, industry in _TITLE_INDUSTRY_PATTERNS:
        if _re.search(pattern, header):
            return industry
    return None


# -- Industry / Occupation aggregation ----------------------------------------

def _aggregate_industries(
    industry_rows: list[dict[str, Any]],
    skill_confidences: dict[int, float],
    top_n: int,
    title_industry: str | None = None,
) -> list[IndustryMatch]:
    """Weighted-vote aggregation per normalised industry_name.

    If *title_industry* is set (detected from resume header), that industry
    gets a 2× multiplicative boost to overcome generic-skill dilution.
    """
    scores: dict[str, float] = {}
    counts: dict[str, int]   = {}

    for row in industry_rows:
        area        = _norm_industry(row["industry_name"])
        skill_conf  = skill_confidences.get(row["skill_id"], 0.5)
        vote        = skill_conf * row["weight"]
        scores[area] = scores.get(area, 0.0) + vote
        counts[area] = counts.get(area, 0) + 1

    if not scores:
        return []

    # Apply title-based industry boost + dampening to overcome generic-skill
    # dilution.  Generic skills (SQL, Python, Excel, JIRA, etc.) inflate IT and
    # B&M for every resume; the title signal is far more reliable for domain.
    if title_industry:
        # 8× boost on the title-detected industry
        if title_industry in scores:
            scores[title_industry] *= 8.0
        elif scores:
            # Seed with the median raw score × 8 if no skills voted yet
            median_score = sorted(scores.values())[len(scores) // 2]
            scores[title_industry] = median_score * 8.0
            counts[title_industry] = 0
        # 0.3× dampening on the current top industry IF it differs from title
        top_area = max(scores, key=scores.get)
        if top_area != title_industry:
            scores[top_area] *= 0.3
        # Extra dampening: when title detects a non-IT domain, IT tool skills
        # (SQL, Python, Docker, etc.) cause massive IT vote inflation — dampen.
        title_is_it = title_industry in ("Information Technology", "Data & Analytics")
        if not title_is_it and "Information Technology" in scores:
            scores["Information Technology"] *= 0.4

    total = sum(scores.values())
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_n]

    return [
        IndustryMatch(
            industry=area,
            confidence=round(min(score / total, 1.0), 4),
            skill_count=counts[area],
        )
        for area, score in ranked
    ]


def _aggregate_occupations(
    industry_rows: list[dict[str, Any]],
    skill_confidences: dict[int, float],
    top_n: int,
    occ_rows: list[dict[str, Any]],
    skill_idf: dict[int, float],
    occ_breadth: dict[int, int],
    sid_to_name: dict[int, str],
) -> list[OccupationMatch]:
    """Architecture-aligned occupation grouping.

    PRIMARY signal: weighted-vote across ``taxonomy_skill_industry.occupation_group``
    (same approach as industry aggregation — architecture §Stage 7).

    ENRICHMENT: ``skill_occupations`` → ``occupations`` used only to populate
    nested per-occupation detail within each top group.
    """
    # ── Step 1: Weighted vote by occupation_group (architecture-aligned) ─
    scores: dict[str, float]   = {}
    counts: dict[str, int]     = {}
    group_skill_sets: dict[str, set[int]] = defaultdict(set)

    for row in industry_rows:
        grp = row.get("occupation_group", "").strip()
        if not grp:
            continue
        skill_conf = skill_confidences.get(row["skill_id"], 0.5)
        vote       = skill_conf * row["weight"]
        scores[grp] = scores.get(grp, 0.0) + vote
        counts[grp] = counts.get(grp, 0) + 1
        group_skill_sets[grp].add(row["skill_id"])

    if not scores:
        return []

    total  = sum(scores.values()) or 1.0
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_n]

    # ── Step 2: Build nested occupation enrichment from skill_occupations ─
    # Map occupation_id → {name, isco, matched_skill_ids}
    occ_skill_map: dict[int, set[int]] = defaultdict(set)
    occ_names: dict[int, str] = {}
    occ_isco: dict[int, str] = {}
    for row in occ_rows:
        oid = row["occupation_id"]
        occ_skill_map[oid].add(row["taxonomy_skill_id"])
        occ_names[oid] = row["occupation_name"]
        if row.get("isco_code"):
            occ_isco[oid] = row["isco_code"]

    # Score individual occupations (overlap + IDF)
    occ_scores: dict[int, float] = {}
    for oid, matched_sids in occ_skill_map.items():
        overlap = len(matched_sids)
        tfidf = sum(
            skill_confidences.get(sid, 0.5) * skill_idf.get(sid, 1.0)
            for sid in matched_sids
        )
        breadth = occ_breadth.get(oid, 1)
        coverage = overlap / max(breadth, 1)
        occ_scores[oid] = (overlap * 10.0) + tfidf * (1.0 + 0.5 * coverage)

    # ── Step 3: For each top group, find matching nested occupations ────
    isco_labels = _get_isco_labels()
    results: list[OccupationMatch] = []

    for grp, score in ranked:
        grp_conf = round(min(score / total, 1.0), 4)
        grp_sids = group_skill_sets.get(grp, set())

        # Find occupations whose matched skills overlap with this group's skills
        occ_details: list[OccupationDetail] = []
        if occ_skill_map:
            grp_lower = grp.lower()
            matching_oids: list[tuple[int, int]] = []
            for oid, matched_sids in occ_skill_map.items():
                overlap = len(matched_sids & grp_sids)
                if overlap >= 1:
                    matching_oids.append((oid, overlap))

            # If no direct overlap, try ISCO code matching as fallback
            if not matching_oids:
                for oid in occ_skill_map:
                    isco = occ_isco.get(oid, "")
                    occ_name_lower = occ_names.get(oid, "").lower()
                    if (any(tok in grp_lower for tok in occ_name_lower.split()[:3]
                            if len(tok) > 3)
                        or any(tok in occ_name_lower for tok in grp_lower.split()[:3]
                               if len(tok) > 3)):
                        matching_oids.append((oid, len(occ_skill_map[oid])))

            # Rank by overlap, take top 5
            matching_oids.sort(key=lambda x: occ_scores.get(x[0], 0.0), reverse=True)
            top_oids = matching_oids[:5]

            if top_oids:
                local_raw = np.array(
                    [occ_scores.get(oid, 0.0) for oid, _ in top_oids],
                    dtype=np.float64,
                )
                local_log = np.array(
                    [math.log1p(max(s, 0.0)) for s in local_raw],
                    dtype=np.float64,
                )
                local_probs = _softmax(local_log, temperature=0.8)

                for j, (oid, overlap) in enumerate(top_oids):
                    matched_sids = occ_skill_map.get(oid, set())
                    matching_names = sorted(
                        sid_to_name[sid]
                        for sid in matched_sids
                        if sid in sid_to_name
                    )
                    occ_details.append(OccupationDetail(
                        occupation=occ_names.get(oid, f"occupation_{oid}"),
                        confidence=float(round(local_probs[j], 4)),
                        skill_overlap=overlap,
                        matching_skills=matching_names[:10],
                    ))

        results.append(OccupationMatch(
            occupation_group=grp,
            confidence=grp_conf,
            skill_count=counts.get(grp, 0),
            occupations=occ_details,
        ))

    return results


# -- Job Level inference ------------------------------------------------------

def _infer_job_level(
    ctx: PipelineContext,
    onet_signals: dict[int, dict[str, Any]],
    industry_rows: list[dict[str, Any]],
) -> JobLevelResult:
    """Rule-based job level from four prioritised signals."""
    skill_ids = ctx.final_skill_ids
    if not skill_ids:
        return JobLevelResult(
            level="entry", confidence=0.5, onet_avg=0.0, evidence_skills=[]
        )

    # Signal 0 (highest priority): explicit title keywords in resume text
    title_level: str | None = None
    header_text = ctx.raw_text[:500].lower() if ctx.raw_text else ""
    for pattern, lvl in _TITLE_LEVEL_PATTERNS:
        if _re.search(pattern, header_text):
            title_level = lvl
            break

    # Signal 1: seniority tokens in occupation groups
    occ_skill_counts: Counter[str] = Counter(
        row["occupation_group"].lower()
        for row in industry_rows
        if row["occupation_group"]
    )
    occ_groups = {grp for grp, cnt in occ_skill_counts.items() if cnt >= 2}

    has_lead_occ = any(
        tok in grp for tok in _LEAD_OCC_TOKENS for grp in occ_groups
    )
    has_senior_occ = any(
        tok in grp for tok in _SENIOR_OCC_TOKENS for grp in occ_groups
    )

    if has_lead_occ:
        token_level: str | None = "lead"
    elif has_senior_occ:
        token_level = "senior"
    else:
        token_level = None

    # Signal 2: ONET importance
    onet_values   = [onet_signals.get(sid, {}).get("onet_importance", 0.0) for sid in skill_ids]
    nonzero_onet  = [v for v in onet_values if v > 0.0]
    coverage      = len(nonzero_onet) / len(onet_values) if onet_values else 0.0
    onet_avg      = sum(onet_values) / len(onet_values) if onet_values else 0.0

    onet_level: str | None = None
    if coverage >= _ONET_MIN_COVERAGE and nonzero_onet:
        onet_eff = sum(nonzero_onet) / len(nonzero_onet)
        for band_name, min_val in _ONET_BANDS:
            if onet_eff >= min_val:
                onet_level = band_name
                break

    # Signal 3: career-area diversity
    distinct_areas = len({
        row["career_area"]
        for row in industry_rows
        if row["career_area"]
    })
    area_level = "entry"
    for band_name, min_areas in _AREA_BANDS:
        if distinct_areas >= min_areas:
            area_level = band_name
            break

    # Combine signals (priority order)
    # title_level (from resume header) is the strongest signal — if present,
    # it overrides all others. Otherwise fall back to max of remaining signals.
    _rank = {"entry": 0, "mid": 1, "senior": 2, "lead": 3}

    if title_level is not None:
        level = title_level
    else:
        candidates = [lv for lv in (token_level, onet_level, area_level) if lv]
        level = max(candidates, key=lambda x: _rank[x]) if candidates else "entry"

    # Confidence
    all_signals = [title_level, token_level, onet_level, area_level]
    agreeing = sum(
        1 for lv in all_signals
        if lv is not None and lv == level
    )
    total_signals = sum(1 for lv in all_signals if lv is not None)
    signal_agreement = agreeing / total_signals if total_signals else 0.5
    # Boost confidence when title keyword matches
    title_bonus = 0.10 if title_level is not None else 0.0
    base_conf = round(0.45 + signal_agreement * 0.30 + min(coverage, 1.0) * 0.10 + title_bonus, 4)
    base_conf = round(min(base_conf, 0.97), 4)

    # Evidence: top-5 skills by ONET importance
    sid_to_name = {c.skill_id: c.canonical_name for c in ctx.candidates}
    evidence_pairs = sorted(
        [(sid, onet_signals.get(sid, {}).get("onet_importance", 0)) for sid in skill_ids],
        key=lambda x: x[1], reverse=True,
    )
    evidence_names = [
        sid_to_name[sid]
        for sid, _ in evidence_pairs[:5]
        if sid in sid_to_name
    ]

    return JobLevelResult(
        level=level,
        confidence=base_conf,
        onet_avg=round(onet_avg, 3),
        evidence_skills=evidence_names,
    )


# -- Main entry point --------------------------------------------------------

async def run_stage7_profile(
    ctx: PipelineContext,
    conn,
) -> PipelineContext:
    """Execute Stage 7: Industry, Occupation Group & Job Level Profiling."""
    t0 = time.perf_counter()

    skill_ids = ctx.final_skill_ids
    if not skill_ids:
        ctx.add_stage_result(
            stage="7",
            status=StageStatus.SKIPPED,
            duration_ms=0,
            payload={"reason": "no_final_skills"},
        )
        return ctx

    # Fetch signals from taxonomy + Lightcast tables
    industry_rows = await _fetch_industry_rows(conn, skill_ids)
    onet_signals = await _fetch_onet_signals(conn, skill_ids)
    occ_rows = await _fetch_lightcast_occupations(conn, skill_ids)

    # Fetch IDF-related data
    all_occ_ids = list({r["occupation_id"] for r in occ_rows})
    occ_breadth = await _fetch_occupation_skill_breadth(conn, all_occ_ids)
    total_occupations = await _fetch_total_occupation_count(conn)

    skill_confidences = {c.skill_id: c.confidence for c in ctx.candidates}
    sid_to_name = {c.skill_id: c.canonical_name for c in ctx.candidates}
    skill_idf = _compute_skill_idf(skill_ids, occ_rows, total_occupations)

    # Detect industry hint from resume title/header
    title_industry = _detect_title_industry(ctx.raw_text)

    # Aggregate
    ctx.industries = _aggregate_industries(
        industry_rows, skill_confidences, INDUSTRY_TOP_N,
        title_industry=title_industry,
    )
    ctx.occupation_groups = _aggregate_occupations(
        industry_rows, skill_confidences, OCCUPATION_TOP_N,
        occ_rows=occ_rows,
        skill_idf=skill_idf,
        occ_breadth=occ_breadth,
        sid_to_name=sid_to_name,
    )
    ctx.job_level = _infer_job_level(ctx, onet_signals, industry_rows)

    duration_ms = int((time.perf_counter() - t0) * 1000)

    total_nested = sum(len(og.occupations) for og in ctx.occupation_groups)
    ctx.add_stage_result(
        stage="7",
        status=StageStatus.OK,
        duration_ms=duration_ms,
        payload={
            "industries_found":     len(ctx.industries),
            "occupations_found":    len(ctx.occupation_groups),
            "nested_occupations":   total_nested,
            "lightcast_occ_rows":   len(occ_rows),
            "total_occupations_db": total_occupations,
            "job_level":            ctx.job_level.level,
            "job_level_confidence": ctx.job_level.confidence,
            "onet_avg":             ctx.job_level.onet_avg,
        },
    )

    log.info(
        "Stage 7 OK — industries=%d occ_groups=%d nested_occupations=%d "
        "level=%s(%.2f) onet_avg=%.2f %dms",
        len(ctx.industries),
        len(ctx.occupation_groups),
        total_nested,
        ctx.job_level.level,
        ctx.job_level.confidence,
        ctx.job_level.onet_avg,
        duration_ms,
    )
    return ctx
