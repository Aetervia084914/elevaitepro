"""
Stage 4 - Alias Detection (3 Tiers: Exact · Normalized · Fuzzy Fallback)

4A — Tier 1: Aho-Corasick Exact Match (Primary — O(n) scan)
  Lowercase cleaned_text, run automaton.iter(), boundary-check each hit.

4B — Tier 2: Normalized Variant Match (whitespace/hyphen/case variants)
  For unmatched aliases, re-scan with normalized automaton on normalized text.
  Confidence = 0.90.

4C — Tier 3: RapidFuzz Fuzzy Match (Optional · OCR / typo resilience)
  Activated when fuzzy=True. N-gram windows scored with fuzz.ratio().
  Threshold from FUZZY_THRESHOLD env var (default 88).
"""
from __future__ import annotations

import logging
import os
import re
import time
from typing import Any

import ahocorasick

from app.services.certification_pipeline.schemas import MatchDetail, Stage4Output

logger = logging.getLogger(__name__)

FUZZY_THRESHOLD = int(os.getenv("FUZZY_THRESHOLD", "88"))

# -- Boundary characters --
# A match is valid only if characters surrounding it are non-alphanumeric
# (or string boundary). Allow trailing + as valid boundary (cert names).
_BOUNDARY_START = re.compile(r"[\s\n\t,;:.!?|()\[\]{}/\-\"'#&]")
_BOUNDARY_END = re.compile(r"[\s\n\t,;:.!?|()\[\]{}/\-\"'#&+]")


def _is_valid_boundary(text: str, start: int, end: int) -> bool:
    """
    Verify match is not a mid-word substring.
    Char before start must be boundary or start-of-string.
    Char after end must be boundary or end-of-string.
    """
    if start > 0:
        ch_before = text[start - 1]
        if ch_before.isalnum():
            return False
    if end < len(text):
        ch_after = text[end]
        if ch_after.isalnum():
            return False
    return True


# ── Tier 1: Aho-Corasick Exact Match ──

def _tier1_exact(
    cleaned_text: str,
    automaton: ahocorasick.Automaton,
    alias_index: dict[str, str],
) -> dict[str, MatchDetail]:
    """
    Tier 1: Lowercase the cleaned_text and scan with the primary automaton.
    Returns dict of alias_lower -> MatchDetail for boundary-validated hits.
    """
    text_lower = cleaned_text.lower()
    matches: dict[str, MatchDetail] = {}

    if len(automaton) == 0:
        return matches

    for end_idx, (original_alias, matched_lower) in automaton.iter(text_lower):
        start = end_idx - len(matched_lower) + 1
        end = end_idx + 1

        if not _is_valid_boundary(text_lower, start, end):
            continue

        key = matched_lower
        if key in matches:
            matches[key].count += 1
            matches[key].positions.append({"start": start, "end": end})
        else:
            matches[key] = MatchDetail(
                alias=original_alias,
                alias_original=alias_index.get(matched_lower, original_alias),
                count=1,
                match_tier="exact",
                confidence=1.0,
                positions=[{"start": start, "end": end}],
            )

    return matches


# ── Tier 2: Normalized Variant Match ──

def _normalize_text_for_tier2(text: str) -> str:
    """Apply same normalization as stage3._normalize_for_tier2 to full text."""
    t = text.lower()
    t = t.replace("-", " ").replace("_", " ")
    t = re.sub(r"\s+", " ", t).strip()
    return t


def _tier2_normalized(
    cleaned_text: str,
    automaton_norm: ahocorasick.Automaton,
    norm_index: dict[str, str],
    tier1_found: set[str],
) -> dict[str, MatchDetail]:
    """
    Tier 2: Normalize the cleaned_text and scan with the normalized automaton.
    Skip aliases already found in Tier 1.
    Confidence = 0.90.
    """
    text_norm = _normalize_text_for_tier2(cleaned_text)
    matches: dict[str, MatchDetail] = {}

    if len(automaton_norm) == 0:
        return matches

    for end_idx, (original_alias, matched_norm) in automaton_norm.iter(text_norm):
        start = end_idx - len(matched_norm) + 1
        end = end_idx + 1

        if not _is_valid_boundary(text_norm, start, end):
            continue

        # Skip if already found in Tier 1
        key = original_alias.lower()
        if key in tier1_found:
            continue

        if key in matches:
            matches[key].count += 1
            matches[key].positions.append({"start": start, "end": end})
        else:
            matches[key] = MatchDetail(
                alias=original_alias,
                alias_original=norm_index.get(matched_norm, original_alias),
                count=1,
                match_tier="normalized",
                confidence=0.90,
                positions=[{"start": start, "end": end}],
            )

    return matches


# ── Tier 3: RapidFuzz Fuzzy Match (Optional) ──

def _tier3_fuzzy(
    cleaned_text: str,
    alias_index: dict[str, str],
    already_found: set[str],
    threshold: int = FUZZY_THRESHOLD,
) -> dict[str, MatchDetail]:
    """
    Tier 3: Fuzzy match remaining aliases using RapidFuzz.
    For each unmatched alias, extract n-gram windows from text and score.
    Only aliases > 5 chars are considered.
    """
    try:
        from rapidfuzz import fuzz
    except ImportError:
        logger.warning("rapidfuzz not installed — Tier 3 fuzzy matching disabled")
        return {}

    matches: dict[str, MatchDetail] = {}
    text_lower = cleaned_text.lower()

    # Collect unmatched aliases > 5 chars
    unmatched = [
        (lower, orig) for lower, orig in alias_index.items()
        if lower not in already_found and len(lower) > 5
    ]

    if not unmatched:
        return matches

    for alias_lower, alias_original in unmatched:
        alias_len = len(alias_lower)
        # Window size: alias length ±20%
        min_win = max(3, int(alias_len * 0.8))
        max_win = int(alias_len * 1.2) + 1

        best_score = 0.0
        best_start = 0
        best_end = 0

        # Slide windows across the text
        for win_size in range(min_win, max_win + 1):
            for i in range(0, len(text_lower) - win_size + 1, max(1, win_size // 4)):
                window = text_lower[i:i + win_size]
                score = fuzz.ratio(alias_lower, window)
                if score > best_score:
                    best_score = score
                    best_start = i
                    best_end = i + win_size

        if best_score >= threshold:
            key = alias_lower
            matches[key] = MatchDetail(
                alias=alias_original,
                alias_original=alias_original,
                count=1,
                match_tier="fuzzy",
                confidence=round(best_score / 100, 2),
                positions=[{"start": best_start, "end": best_end}],
            )

    return matches


# ── Combined Stage 4 Entry Point ──

# Single-word cert names that are too generic to match on their own.
# These must appear as part of a multi-word match or be skipped.
_GENERIC_SINGLE_WORDS = frozenset({
    "engineering", "insurance", "docker", "kubernetes", "python",
    "java", "aws", "azure", "linux", "oracle", "cisco",
    "google", "microsoft", "security", "analytics", "data",
    "cloud", "network", "project", "management", "agile",
    "scrum", "sales", "marketing", "finance", "accounting",
    "design", "testing", "automation", "devops", "html", "css",
})

# ── Rule 2 filter (whitelist approach) ────────────────────────────────────────
#
# With 124K+ aliases including generic words ("Manager", "API", "India",
# "Software Engineering", "AI Engineer", etc.), a blocklist can never keep up.
# Instead we use a WHITELIST: an alias is accepted ONLY if it structurally
# looks like a certification name.
#
# An alias passes Rule 2 if ANY of these signals are present:
#   1. Contains a certification keyword ("certified", "certificate", etc.)
#   2. Is an all-uppercase abbreviation ≥ 5 chars (e.g. "CISSP", "CCNP")
#   3. Contains a version/level indicator ("v2", "level 1", "associate", etc.)
#   4. Matches a known cert-specific pattern (e.g. "AWS SAA-C03", "AZ-900")

_CERT_KEYWORDS = re.compile(
    r"\b(certif|credential|accredit|licen[cs]|diploma|charter|registered|fellow|comptia|six\s*sigma)",
    re.IGNORECASE,
)

# Pattern: "Certified <noun>" — always accepted (e.g. Certified ScrumMaster)
_CERTIFIED_X = re.compile(r"^certified\s+\S+", re.IGNORECASE)

# All-caps abbreviation ≥ 5 chars (CISSP, CCNP, TOGAF)
_ALLCAPS_ABBREV = re.compile(r"^[A-Z][A-Z0-9\-\.]{3,}$")

# Common all-caps English words / country names / acronyms that are NOT certs.
_ALLCAPS_REJECT = frozenset({
    "INDIA", "CHINA", "JAPAN", "KOREA", "BRAZIL", "SPAIN", "FRANCE",
    "ITALY", "GERMANY", "CANADA", "AUSTRALIA", "MEXICO", "RUSSIA",
    "ABOUT", "THEIR", "THESE", "THOSE", "WHICH", "WHERE", "WOULD",
    "COULD", "SHOULD", "AFTER", "BEFORE", "EVERY", "NEVER", "OFTEN",
    "UNDER", "ABOVE", "BELOW", "SINCE", "WHILE", "USING", "BASED",
    "SCOR", "SCORE",  # SCOR = Supply Chain Operations Reference (not cert abbrev)
    "ENGINEERING", "MARKETING", "MANAGEMENT", "FINANCE", "SECURITY",
    "ANALYTICS", "TESTING", "AUTOMATION", "OPERATIONS", "DESIGN",
    "DEVELOPMENT", "ARCHITECTURE", "COMPLIANCE", "GOVERNANCE",
    "SOFTWARE", "HARDWARE", "NETWORK", "DATABASE", "CLOUD",
    "DEVOPS", "GITHUB", "LINUX", "WINDOWS", "PYTHON", "DOCKER",
    "JAVA", "JAVASCRIPT", "REACT", "ANGULAR", "MYSQL", "ORACLE",
    "KAFKA", "REDIS", "NGINX", "AZURE", "KERAS", "FLASK",
    "JIRA", "SLACK", "TEAMS", "EXCEL", "POWER", "SCALA",
    "SPARK", "HADOOP", "TABLEAU", "MATLAB", "SWIFT", "UNITY",
})

# Well-known short cert abbreviations (< 5 chars) that we always accept.
_KNOWN_SHORT_CERTS = frozenset({
    "PMP", "CPA", "CFA", "CKA", "CKS", "CKAD", "RHCE", "RHCSA",
    "CISA", "CISM", "CRISC", "CGEIT", "CSM", "CSPO", "SAFe",
    "CEH", "OSCP", "OSCE", "GPEN", "GCIH", "GSEC",
    "CCNA", "CCNP", "CCIE", "VCP", "MCSE", "MCSA",
    "CAPM", "CBAP", "PMI", "LEED", "CMA", "CIA",
    "PHR", "SPHR", "SHRM", "IIBA", "ITIL",
})

# Version/level indicators in cert names
_VERSION_LEVEL = re.compile(
    r"\b(v\d|level\s*\d|tier\s*\d|associate|professional|expert|specialist|master|foundation|practitioner|advanced)\b",
    re.IGNORECASE,
)

# Vendor exam code patterns: AZ-900, SAA-C03, 1Z0-819, SY0-601, etc.
_EXAM_CODE = re.compile(r"\b[A-Z]{1,4}[\-\.][A-Z0-9]{2,5}\b")


def _is_certification_like(alias: str) -> bool:
    """Return True if the alias structurally resembles a certification name.

    This is a whitelist approach: only aliases that contain certification
    indicators are accepted when scanning full resume text (Rule 2).
    """
    stripped = alias.strip()
    upper = stripped.upper()
    word_count = len(stripped.split())

    # Signal 0: known short cert abbreviation (explicit whitelist)
    if upper in _KNOWN_SHORT_CERTS:
        return True

    # Signal 1: contains a certification keyword
    if _CERT_KEYWORDS.search(alias):
        if word_count >= 3:
            return True
        if word_count == 2:
            lower = stripped.lower()
            # Reject known too-generic 2-word cert patterns
            if lower not in ("certified professional", "certified associate",
                             "certified expert", "certified specialist"):
                return True
        # Single-word with ending cert noun
        lower = stripped.lower()
        if lower.endswith(("certificate", "certification", "credential",
                           "diploma", "license", "licence")):
            return True

    # Signal 2: all-caps abbreviation ≥ 5 chars, not a common English word
    if _ALLCAPS_ABBREV.match(stripped) and upper not in _ALLCAPS_REJECT:
        return True

    # Signal 3: version / level indicator (associate, professional, expert, etc.)
    # Requires additional context to avoid generic job titles.
    if _VERSION_LEVEL.search(alias):
        lower = stripped.lower()
        if word_count >= 3:
            # Accept if the phrase contains "management" + level word (PMP pattern)
            if "management" in lower and any(
                w in lower for w in ("professional", "practitioner", "foundation")
            ):
                return True
            # Accept if it contains a vendor/org name + a cert-level word
            _CERT_LEVEL_WORDS = {
                "associate", "professional", "expert", "specialist",
                "practitioner", "foundation", "master",
            }
            words_set = set(lower.split())
            has_level_word = bool(words_set & _CERT_LEVEL_WORDS)
            has_vendor = any(v in lower for v in (
                "cisco", "aws", "google", "microsoft", "comptia", "oracle",
                "vmware", "redhat", "red hat", "salesforce", "sap", "ibm",
                "databricks", "dataiku", "snowflake", "hashicorp", "terraform",
                "kubernetes", "docker", "linux", "itil", "prince2", "togaf",
                "pmi", "isaca", "isc2", "(isc)²",
            ))
            if has_vendor and has_level_word:
                return True
            # Accept if it also has a cert keyword (≥ 3 words already)
            if _CERT_KEYWORDS.search(alias):
                return True
        if word_count == 2:
            words_lower = stripped.lower().split()
            if words_lower[1] in ("foundation", "practitioner"):
                return True

    # Signal 4: vendor exam code pattern (AZ-900, SAA-C03, etc.)
    if _EXAM_CODE.search(alias):
        return True

    return False


def _filter_rule1(matches: dict[str, MatchDetail]) -> dict[str, MatchDetail]:
    """Filter Tier 1 results for Rule 1 (cert section scan).

    Even within a detected certification section, very short aliases
    (≤ 5 chars) cause false positives because section boundaries are
    imperfect and sections often contain surrounding text.

    Keeps short aliases ONLY if they are in _KNOWN_SHORT_CERTS.
    Also rejects single generic words (same as _cert_name_scan).
    """
    filtered: dict[str, MatchDetail] = {}
    for key, detail in matches.items():
        alias_text = detail.alias.strip()
        alias_upper = alias_text.upper()
        alias_lower = alias_text.lower()

        # Reject single generic words
        if alias_lower in _GENERIC_SINGLE_WORDS:
            logger.debug("Rule 1 reject generic word: %r", alias_text)
            continue

        # Short aliases (≤ 5 chars): only accept if known cert abbreviation
        if len(alias_text) <= 5:
            if alias_upper in _KNOWN_SHORT_CERTS:
                filtered[key] = detail
            else:
                logger.debug("Rule 1 reject short alias: %r (not in known certs)", alias_text)
            continue

        filtered[key] = detail
    return filtered


def _filter_rule2(matches: dict[str, MatchDetail]) -> dict[str, MatchDetail]:
    """Filter Tier 1 results for Rule 2 (full-text scan, no cert section).

    Uses a whitelist approach: only aliases that structurally look like
    certification names are kept. This eliminates false positives from
    generic words, job titles, tool names, country names, etc.
    """
    filtered: dict[str, MatchDetail] = {}
    for key, detail in matches.items():
        alias_text = detail.alias.strip()
        if _is_certification_like(alias_text):
            filtered[key] = detail
        else:
            logger.debug("Rule 2 reject: %r (not certification-like)", alias_text)
    return filtered


def _cert_name_scan(
    full_text: str,
    cert_name_automaton: ahocorasick.Automaton,
    cert_name_index: dict[str, str],
) -> dict[str, MatchDetail]:
    """
    Scan text for certification names from public.certifications.
    Returns dict of name_lower -> MatchDetail with match_tier='cert_name'.
    Rejects single-word generic matches that are too ambiguous.
    """
    text_lower = full_text.lower()
    matches: dict[str, MatchDetail] = {}

    if len(cert_name_automaton) == 0:
        return matches

    for end_idx, (original_name, matched_lower) in cert_name_automaton.iter(text_lower):
        start = end_idx - len(matched_lower) + 1
        end = end_idx + 1

        if not _is_valid_boundary(text_lower, start, end):
            continue

        # Reject single-word generic matches
        if matched_lower in _GENERIC_SINGLE_WORDS:
            continue

        key = matched_lower
        if key in matches:
            matches[key].count += 1
            matches[key].positions.append({"start": start, "end": end})
        else:
            matches[key] = MatchDetail(
                alias=original_name,
                alias_original=cert_name_index.get(matched_lower, original_name),
                count=1,
                match_tier="cert_name",
                confidence=1.0,
                positions=[{"start": start, "end": end}],
            )

    return matches


async def stage4_detect(
    cleaned_text: str,
    automaton: ahocorasick.Automaton,
    automaton_norm: ahocorasick.Automaton,
    alias_index: dict[str, str],
    norm_index: dict[str, str],
    fuzzy_enabled: bool = False,
    min_confidence: float = 0.0,
    cert_section_text: str | None = None,
    cert_section_offset: int = 0,
    cert_name_automaton: ahocorasick.Automaton | None = None,
    cert_name_index: dict[str, str] | None = None,
) -> Stage4Output:
    """
    Stage 4: Run alias detection + certification name detection.

    Rule 1 — Certification section found:
             Tier 1 exact + Tier 2 normalized + cert-name scan on section text.
    Rule 2 — No certification section found:
             Tier 1 exact match ONLY on full text (no normalized, no fuzzy,
             no cert-name scan) to avoid false positives from resume body.

    Returns Stage4Output with merged matches, found list, and metadata.
    """
    t0 = time.perf_counter()

    # Determine the text for alias matching
    alias_text = cert_section_text if cert_section_text else cleaned_text
    section_used = cert_section_text is not None

    # Tier 1: Exact Aho-Corasick on alias_text
    t1 = time.perf_counter()
    tier1 = _tier1_exact(alias_text, automaton, alias_index)
    tier1_ms = (time.perf_counter() - t1) * 1000

    # Adjust positions back to full-text offsets if section was used
    if section_used and cert_section_offset > 0:
        for m in tier1.values():
            m.positions = [{"start": p["start"] + cert_section_offset, "end": p["end"] + cert_section_offset} for p in m.positions]

    # Rule 1 filter: even in cert sections, remove short/generic aliases
    if section_used:
        pre_filter = len(tier1)
        tier1 = _filter_rule1(tier1)
        if pre_filter != len(tier1):
            logger.info(
                "Rule 1 filter: removed %d short/generic alias hits from cert section",
                pre_filter - len(tier1),
            )

    # Rule 2 filter: when scanning full text, remove generic/short aliases
    if not section_used:
        pre_filter = len(tier1)
        tier1 = _filter_rule2(tier1)
        if pre_filter != len(tier1):
            logger.info(
                "Rule 2 filter: removed %d generic alias hits from full-text scan",
                pre_filter - len(tier1),
            )

    tier1_keys = set(tier1.keys())

    # Tier 2: Normalized variant — ONLY when cert section exists (Rule 1)
    tier2: dict[str, MatchDetail] = {}
    tier2_ms = 0.0
    if section_used:
        t2 = time.perf_counter()
        tier2 = _tier2_normalized(alias_text, automaton_norm, norm_index, tier1_keys)
        tier2_ms = (time.perf_counter() - t2) * 1000

        if cert_section_offset > 0:
            for m in tier2.values():
                m.positions = [{"start": p["start"] + cert_section_offset, "end": p["end"] + cert_section_offset} for p in m.positions]

        # Apply Rule 1 filter to Tier 2 as well
        pre_t2 = len(tier2)
        tier2 = _filter_rule1(tier2)
        if pre_t2 != len(tier2):
            logger.info(
                "Rule 1 filter (Tier 2): removed %d short/generic alias hits",
                pre_t2 - len(tier2),
            )

    all_found = tier1_keys | set(tier2.keys())

    # Tier 3: Fuzzy — ONLY when cert section exists AND fuzzy requested (Rule 1)
    tier3: dict[str, MatchDetail] = {}
    tier3_ms = 0.0
    if fuzzy_enabled and section_used:
        t3 = time.perf_counter()
        tier3 = _tier3_fuzzy(alias_text, alias_index, all_found)
        tier3_ms = (time.perf_counter() - t3) * 1000

        if cert_section_offset > 0:
            for m in tier3.values():
                m.positions = [{"start": p["start"] + cert_section_offset, "end": p["end"] + cert_section_offset} for p in m.positions]

    # Cert-name scan — ONLY when cert section exists (Rule 1)
    # Rule 2 (no section) relies solely on Tier 1 exact alias matching.
    cert_name_hits: dict[str, MatchDetail] = {}
    cert_name_ms = 0.0
    if cert_name_automaton and cert_name_index and section_used:
        tc = time.perf_counter()
        cert_name_hits = _cert_name_scan(cert_section_text, cert_name_automaton, cert_name_index)
        if cert_section_offset > 0:
            for m in cert_name_hits.values():
                m.positions = [{"start": p["start"] + cert_section_offset, "end": p["end"] + cert_section_offset} for p in m.positions]
        cert_name_ms = (time.perf_counter() - tc) * 1000

    # Merge: cert_name (lowest) < Tier 3 < Tier 2 < Tier 1 (highest)
    merged: dict[str, MatchDetail] = {}
    merged.update(cert_name_hits)  # lowest priority
    merged.update(tier3)
    merged.update(tier2)
    merged.update(tier1)           # highest priority

    # Apply min_confidence filter
    if min_confidence > 0:
        merged = {k: v for k, v in merged.items() if v.confidence >= min_confidence}

    found_list = sorted([m.alias_original for m in merged.values()])
    total_found = len(found_list)

    total_ms = (time.perf_counter() - t0) * 1000

    stageoutput: dict[str, Any] = {
        "tier1_exact_count": len(tier1),
        "tier2_normalized_count": len(tier2),
        "tier3_fuzzy_count": len(tier3),
        "cert_name_count": len(cert_name_hits),
        "total_found": total_found,
        "fuzzy_enabled": fuzzy_enabled,
        "fuzzy_threshold": FUZZY_THRESHOLD if fuzzy_enabled else None,
        "min_confidence_applied": min_confidence,
        "cert_section_used": section_used,
        "cert_section_chars": len(alias_text) if section_used else None,
        "tier1_ms": round(tier1_ms, 2),
        "tier2_ms": round(tier2_ms, 2),
        "tier3_ms": round(tier3_ms, 2) if fuzzy_enabled else None,
        "cert_name_ms": round(cert_name_ms, 2),
        "execution_ms": round(total_ms, 2),
    }

    logger.info(
        "Stage 4 complete: T1=%d exact, T2=%d norm, T3=%d fuzzy, cert_names=%d, section=%s, total=%d found, %.1fms",
        len(tier1), len(tier2), len(tier3), len(cert_name_hits), section_used, total_found, total_ms,
    )

    return Stage4Output(
        matches=merged,
        found=found_list,
        total_found=total_found,
        stageoutput=stageoutput,
    )
