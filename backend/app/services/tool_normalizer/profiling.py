"""Tool Normalizer — Post-pipeline profiling.

Adds industry, occupation, and job-level inference to the tool extraction
response.  Runs **after** the main pipeline (stages 1-13) and never modifies
the existing ``tools / software / technology`` output — it only appends a
new ``profile`` key.

Logic:
  1. Map extracted tool canonical_names → taxonomy_skills skill_ids
     (exact canonical match first, then alias fallback).
  2. Query taxonomy_skill_industry for those skill_ids.
  3. Weighted-vote aggregation (confidence × weight) → single best industry.
  4. Filter occupation_groups to winning industry → single best occupation.
  5. Infer job level from years-of-experience (extracted from text) +
     skill depth (count × mean confidence).
"""
from __future__ import annotations

import logging
import re
from collections import defaultdict
from typing import Any

from sqlalchemy import text as sa_text
from sqlalchemy.engine import Engine

log = logging.getLogger(__name__)

# ── Standard 14-industry set ────────────────────────────────────────────────
STANDARD_INDUSTRIES = frozenset({
    "Information Technology", "Healthcare", "Finance", "Manufacturing",
    "Engineering", "Business & Management", "Human Resources",
    "Marketing & Sales", "Education", "Legal", "Design",
    "Logistics & Supply Chain", "Customer & Client Support",
    "Agriculture & Environment",
})

# ── Title → industry patterns (checked on first 500 chars) ─────────────────
_TITLE_INDUSTRY_PATTERNS: list[tuple[str, str]] = [
    (r"healthcare\s+data",             "Healthcare"),
    (r"clinical\s+data",               "Healthcare"),
    (r"software\s+(engineer|develop)", "Information Technology"),
    (r"web\s+(develop|engineer)",      "Information Technology"),
    (r"backend\s+develop",             "Information Technology"),
    (r"frontend\s+develop",            "Information Technology"),
    (r"full.?stack",                    "Information Technology"),
    (r"data\s+(scien|engineer|analy)", "Information Technology"),
    (r"devops",                         "Information Technology"),
    (r"cloud\s+(engineer|arch)",       "Information Technology"),
    (r"machine\s+learn",              "Information Technology"),
    (r"qa\s+(engineer|lead|manager)",  "Information Technology"),
    (r"sdet\b",                        "Information Technology"),
    (r"test\s+(engineer|automation)",  "Information Technology"),
    (r"manufactur",                    "Manufacturing"),
    (r"industrial\s+engineer",         "Manufacturing"),
    (r"quality\s+(engineer|manager)(?!.*(?:assurance|software|qa))", "Manufacturing"),
    (r"instruct|curriculum|\bteach",   "Education"),
    (r"marketing|brand\s+(manager|director)", "Marketing & Sales"),
    (r"\bsales\b",                     "Marketing & Sales"),
    (r"\bnurs|medical|clinical|pharma","Healthcare"),
    (r"\bhr\b|human\s+resource|recruit","Human Resources"),
    (r"logistic|supply\s+chain",       "Logistics & Supply Chain"),
    (r"financ|account",                "Finance"),
    (r"legal\b|attorney|lawyer",       "Legal"),
]

# ── Years-of-experience regex ───────────────────────────────────────────────
_YOE_PATTERNS = [
    re.compile(r"(\d{1,2})\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)", re.I),
    re.compile(r"(?:experience|exp)\s*(?:of\s*)?(\d{1,2})\+?\s*(?:years?|yrs?)", re.I),
    re.compile(r"over\s+(\d{1,2})\s+(?:years?|yrs?)", re.I),
]

# ── Job-level bands ─────────────────────────────────────────────────────────
_TITLE_LEVEL_PATTERNS: list[tuple[str, str]] = [
    (r"\b(?:principal|staff|distinguished|fellow)\b",                       "lead"),
    (r"\b(?:director|vp|vice\s*president|head\s+of|chief|cto|cio|cfo)\b",  "lead"),
    (r"\b(?:lead|manager|team\s*lead|tech\s*lead)\b",                      "lead"),
    (r"\b(?:senior|sr\.?|iii)\b",                                          "senior"),
    (r"\b(?:specialist|ii|mid[\-\s]level)\b",                              "mid"),
    (r"\b(?:associate|junior|jr\.?|entry[\-\s]level|intern|trainee)\b",    "entry"),
]


# ── Helpers ─────────────────────────────────────────────────────────────────

def _detect_title_industry(raw_text: str | None) -> str | None:
    if not raw_text:
        return None
    header = raw_text[:500].lower()
    for pattern, industry in _TITLE_INDUSTRY_PATTERNS:
        if re.search(pattern, header):
            return industry
    return None


_MONTH_ABBR = (
    r"(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|"
    r"jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
)
_SEP = r"[\s]*[\u2013\u2014\u2015\-–—~]+[\s]*|[\s]+to[\s]+"
_PRESENT = r"(?:present|current|now|ongoing|till(?:[-\s']?)date|til\s+date|to\s+date|today|date)"
_Y4 = r"(?:19|20)\d{2}"

_EDU_RE = re.compile(
    r"\b(?:b\.?(?:tech|sc|a|e)|m\.?(?:tech|sc|a|e|ba)|ph\.?d|"
    r"bachelor|master|diploma|degree|university|college|school|"
    r"gpa|cgpa|grade|graduated|education)\b", re.I,
)

_DATE_RANGE_PATTERNS = [
    re.compile(rf"{_MONTH_ABBR}[\s./,-]*(?P<y1>{_Y4})(?:{_SEP})(?:(?P<present>{_PRESENT})|{_MONTH_ABBR}[\s./,-]*(?P<y2>{_Y4}))", re.I),
    re.compile(rf"(?P<y1>{_Y4})(?:{_SEP})(?:(?P<present>{_PRESENT})|(?P<y2>{_Y4}))", re.I),
    re.compile(rf"\d{{1,2}}[/.](?P<y1>{_Y4})(?:{_SEP})(?:(?P<present>{_PRESENT})|\d{{1,2}}[/.](?P<y2>{_Y4}))", re.I),
    re.compile(rf"{_MONTH_ABBR}[\s'.-]*(?P<y1>\d{{2}})\b(?:{_SEP})(?:(?P<present>{_PRESENT})|{_MONTH_ABBR}[\s'.-]*(?P<y2>\d{{2}}))\b", re.I),
]


def _parse_year(raw: str | None, current_year: int) -> int | None:
    if not raw:
        return None
    raw = raw.strip()
    try:
        y = int(raw)
    except ValueError:
        return None
    if y < 100:
        y = y + 2000 if y <= (current_year % 100 + 4) else y + 1900
    if 1970 <= y <= current_year + 1:
        return y
    return None


def _line_is_education(text: str, pos: int) -> bool:
    line_start = text.rfind("\n", 0, pos) + 1
    line_end = text.find("\n", pos)
    if line_end == -1:
        line_end = len(text)
    return bool(_EDU_RE.search(text[line_start:line_end]))


def _extract_years(raw_text: str | None) -> int | None:
    """Extract years of experience from resume text.

    Strategy:
      1. Look for explicit statements ("8 years of experience").
      2. Extract date ranges from work history (skip education lines).
      3. Fallback: scan all 4-digit years on non-education lines.
    """
    if not raw_text:
        return None

    from datetime import datetime
    current_year = datetime.now().year

    for pat in _YOE_PATTERNS:
        m = pat.search(raw_text[:4000])
        if m:
            try:
                val = int(m.group(1))
                if 1 <= val <= 50:
                    return val
            except (ValueError, IndexError):
                continue

    min_year: int | None = None
    max_year: int | None = None
    matched_ranges: list[tuple[int, int]] = []

    for pat in _DATE_RANGE_PATTERNS:
        for m in pat.finditer(raw_text):
            if _line_is_education(raw_text, m.start()):
                continue
            y1 = _parse_year(m.group("y1"), current_year)
            if y1 is None:
                continue
            if m.group("present"):
                y2 = current_year
            else:
                y2 = _parse_year(m.group("y2"), current_year)
                if y2 is None:
                    continue
            if y2 < y1 or (y2 - y1) > 40:
                continue
            matched_ranges.append((y1, y2))
            if min_year is None or y1 < min_year:
                min_year = y1
            if max_year is None or y2 > max_year:
                max_year = y2

    if min_year is not None and max_year is not None:
        years = max_year - min_year
        if 1 <= years <= 50:
            return years

    all_years: list[int] = []
    for line in raw_text.split("\n"):
        if _EDU_RE.search(line):
            continue
        for ym in re.finditer(r"\b((?:19|20)\d{2})\b", line):
            y = int(ym.group(1))
            if 1980 <= y <= current_year + 1:
                all_years.append(y)

    if len(all_years) >= 2:
        span = max(all_years) - min(all_years)
        if 1 <= span <= 50:
            return span

    return None


def _detect_title_level(raw_text: str | None) -> str | None:
    if not raw_text:
        return None
    header = raw_text[:500].lower()
    for pattern, lvl in _TITLE_LEVEL_PATTERNS:
        if re.search(pattern, header):
            return lvl
    return None


def _infer_job_level(
    years: int | None,
    skill_count: int,
    mean_confidence: float,
    title_level: str | None,
) -> dict[str, Any]:
    """Infer job level from years + skill depth + title keywords.

    Priority:
      1. Title keywords (strongest signal)
      2. Years of experience
      3. Skill count × confidence (depth proxy)
    """
    _rank = {"entry": 0, "mid": 1, "senior": 2, "lead": 3}

    # Signal 1: title keywords
    # Signal 2: years of experience
    yoe_level: str | None = None
    if years is not None:
        if years >= 12:
            yoe_level = "lead"
        elif years >= 7:
            yoe_level = "senior"
        elif years >= 3:
            yoe_level = "mid"
        else:
            yoe_level = "entry"

    # Signal 3: skill depth (count × mean_confidence)
    depth_score = skill_count * mean_confidence
    if depth_score >= 25:
        depth_level = "lead"
    elif depth_score >= 15:
        depth_level = "senior"
    elif depth_score >= 7:
        depth_level = "mid"
    else:
        depth_level = "entry"

    # Combine: title > years > depth
    if title_level is not None:
        level = title_level
    elif yoe_level is not None:
        # Blend years + depth: take max
        level = max(yoe_level, depth_level, key=lambda x: _rank[x])
    else:
        level = depth_level

    # Confidence from signal agreement
    signals = [s for s in (title_level, yoe_level, depth_level) if s is not None]
    agreeing = sum(1 for s in signals if s == level)
    total = len(signals) or 1
    agreement = agreeing / total
    confidence = round(min(0.50 + agreement * 0.30 + (0.10 if title_level else 0.0), 0.97), 4)

    return {
        "level": level,
        "confidence": confidence,
        "years_experience": years,
        "signals": {
            "title": title_level,
            "years": yoe_level,
            "skill_depth": depth_level,
        },
    }


# ── DB queries (sync) ──────────────────────────────────────────────────────

def _resolve_skill_ids(
    engine: Engine,
    canonical_names: list[str],
) -> dict[str, int]:
    """Map tool canonical_names → skill_ids via taxonomy_skills + aliases."""
    if not canonical_names:
        return {}

    name_to_id: dict[str, int] = {}
    lowered = [n.lower() for n in canonical_names]

    with engine.connect() as conn:
        # Pass 1: exact canonical_name match
        rows = conn.execute(
            sa_text(
                "SELECT lower(canonical_name), skill_id "
                "FROM taxonomy_skills "
                "WHERE lower(canonical_name) = ANY(:names)"
            ),
            {"names": lowered},
        ).fetchall()
        for row in rows:
            name_to_id[row[0]] = row[1]

        # Pass 2: alias fallback for unresolved names
        unresolved = [n for n in lowered if n not in name_to_id]
        if unresolved:
            alias_rows = conn.execute(
                sa_text(
                    "SELECT a.alias_lower, a.skill_id "
                    "FROM taxonomy_aliases a "
                    "WHERE a.alias_lower = ANY(:names)"
                ),
                {"names": unresolved},
            ).fetchall()
            for row in alias_rows:
                if row[0] not in name_to_id:
                    name_to_id[row[0]] = row[1]

    return name_to_id


def _fetch_industry_rows(
    engine: Engine,
    skill_ids: list[int],
) -> list[dict[str, Any]]:
    """Return industry + occupation rows for given skill_ids."""
    if not skill_ids:
        return []
    with engine.connect() as conn:
        rows = conn.execute(
            sa_text(
                "SELECT skill_id, industry_name, "
                "       COALESCE(occupation_group, '') AS occupation_group, "
                "       COALESCE(weight, 1.0) AS weight "
                "FROM taxonomy_skill_industry "
                "WHERE skill_id = ANY(:ids) "
                "  AND industry_name IS NOT NULL"
            ),
            {"ids": skill_ids},
        ).fetchall()
    return [
        {
            "skill_id":         r[0],
            "industry_name":    r[1],
            "occupation_group": r[2],
            "weight":           float(r[3]),
        }
        for r in rows
    ]


# ── Aggregation ─────────────────────────────────────────────────────────────

def _aggregate_single_industry(
    industry_rows: list[dict[str, Any]],
    skill_confidences: dict[int, float],
    title_industry: str | None,
) -> dict[str, Any] | None:
    """Weighted-vote → single best industry."""
    scores: dict[str, float] = {}
    counts: dict[str, int] = {}

    for row in industry_rows:
        ind = row["industry_name"]
        skill_conf = skill_confidences.get(row["skill_id"], 0.5)
        vote = skill_conf * row["weight"]
        scores[ind] = scores.get(ind, 0.0) + vote
        counts[ind] = counts.get(ind, 0) + 1

    if not scores:
        return None

    # Title boost: 5× on title-detected industry, 0.3× dampen top non-title
    if title_industry:
        if title_industry in scores:
            scores[title_industry] *= 5.0
        else:
            median = sorted(scores.values())[len(scores) // 2]
            scores[title_industry] = median * 5.0
            counts[title_industry] = 0

        top = max(scores, key=scores.get)
        if top != title_industry:
            scores[top] *= 0.3

        # Dampen IT when title is non-IT (generic tool dilution)
        if title_industry != "Information Technology" and "Information Technology" in scores:
            scores["Information Technology"] *= 0.4

    total = sum(scores.values()) or 1.0
    best = max(scores, key=scores.get)
    confidence = round(min(scores[best] / total, 1.0), 4)

    return {
        "name": best,
        "confidence": confidence,
        "skill_count": counts.get(best, 0),
    }


def _aggregate_occupations(
    industry_rows: list[dict[str, Any]],
    skill_confidences: dict[int, float],
    winning_industry: str,
    *,
    max_results: int = 5,
    min_confidence: float = 0.05,
) -> list[dict[str, Any]]:
    """Return multiple occupations ranked by weighted vote.

    Occupations from the winning industry get full weight;
    cross-industry occupations are included at 0.3× weight.
    """
    scores: dict[str, float] = {}
    skills_per_occ: dict[str, set[int]] = {}

    for row in industry_rows:
        grp = row["occupation_group"].strip()
        if not grp:
            continue
        skill_conf = skill_confidences.get(row["skill_id"], 0.5)
        weight = row["weight"]
        if row["industry_name"] != winning_industry:
            weight *= 0.3
        vote = skill_conf * weight
        scores[grp] = scores.get(grp, 0.0) + vote
        skills_per_occ.setdefault(grp, set()).add(row["skill_id"])

    if not scores:
        return []

    total = sum(scores.values()) or 1.0
    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)

    results: list[dict[str, Any]] = []
    for name, score in ranked[:max_results]:
        conf = round(min(score / total, 1.0), 4)
        if conf < min_confidence:
            break
        results.append({
            "name": name,
            "confidence": conf,
            "skill_count": len(skills_per_occ.get(name, set())),
        })
    return results


# ── Public API ──────────────────────────────────────────────────────────────

def profile_from_tools(
    engine: Engine,
    tool_result: dict[str, Any],
    raw_text: str | None = None,
) -> dict[str, Any]:
    """Build industry / occupation / job_level profile from extracted tools.

    Args:
        engine:      SQLAlchemy sync engine (``app.state.tn_engine``).
        tool_result: The pipeline output ``{"tools": [...], "software": [...], "technology": [...]}``.
        raw_text:    Original resume text (for title hints + years extraction).

    Returns:
        ``{"industry": {...}, "occupation": {...}, "job_level": {...}}``
        or ``{}`` on failure / no data.
    """
    try:
        # Collect all extracted items with confidence
        all_items: list[dict[str, Any]] = []
        for bucket in ("tools", "software", "technology"):
            all_items.extend(tool_result.get(bucket, []))

        if not all_items:
            return {}

        canonical_names = [
            item.get("canonical_name", item.get("tool_name", ""))
            for item in all_items
            if item.get("canonical_name") or item.get("tool_name")
        ]
        item_confidences = {
            (item.get("canonical_name") or item.get("tool_name", "")).lower():
                item.get("confidence", 0.5)
            for item in all_items
        }

        # Step 1: resolve to skill_ids
        name_to_sid = _resolve_skill_ids(engine, canonical_names)
        if not name_to_sid:
            log.debug("Profiling: no tools resolved to taxonomy skill_ids")
            return {}

        # Build skill_id → confidence map
        skill_confidences: dict[int, float] = {}
        for name_lower, sid in name_to_sid.items():
            skill_confidences[sid] = item_confidences.get(name_lower, 0.5)

        skill_ids = list(set(name_to_sid.values()))

        # Step 2: fetch industry rows
        industry_rows = _fetch_industry_rows(engine, skill_ids)

        # Step 3: detect title hint
        title_industry = _detect_title_industry(raw_text)

        # Step 4: aggregate → single industry
        industry = _aggregate_single_industry(
            industry_rows, skill_confidences, title_industry,
        )

        # Step 5: ranked occupations
        occupations: list[dict[str, Any]] = []
        if industry:
            occupations = _aggregate_occupations(
                industry_rows, skill_confidences, industry["name"],
            )

        # Step 6: job level
        years = _extract_years(raw_text)
        title_level = _detect_title_level(raw_text)
        mean_conf = (
            sum(item_confidences.values()) / len(item_confidences)
            if item_confidences else 0.5
        )
        job_level = _infer_job_level(
            years=years,
            skill_count=len(all_items),
            mean_confidence=mean_conf,
            title_level=title_level,
        )

        profile: dict[str, Any] = {"job_level": job_level}
        if industry:
            profile["industry"] = industry
        if occupations:
            profile["occupations"] = occupations

        log.info(
            "Profiling OK — industry=%s(%.2f) occupations=%d level=%s(%.2f) yoe=%s tools_resolved=%d/%d",
            industry["name"] if industry else "none",
            industry["confidence"] if industry else 0,
            len(occupations),
            job_level["level"],
            job_level["confidence"],
            years,
            len(name_to_sid),
            len(canonical_names),
        )
        return profile

    except Exception:
        log.exception("Profiling failed — returning empty profile")
        return {}
