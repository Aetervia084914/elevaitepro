"""Detect and extract canonical resume sections using YAML/JSON/CSV reference files."""
from __future__ import annotations

import csv
import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

# Resolve to <backend>/data regardless of install drive.
# This file lives at <backend>/app/services/resume_parser/section_detector.py
_DATA_DIR = Path(__file__).resolve().parents[3] / "data"

MIN_BODY_CHARS = 12
MIN_CONFIDENCE = 0.6


@lru_cache(maxsize=1)
def _load_aliases() -> dict[str, list[str]]:
    with open(_DATA_DIR / "section_heading_aliases.json", encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=1)
def _load_patterns() -> dict[str, Any]:
    with open(_DATA_DIR / "resume_section_patterns.yml", encoding="utf-8") as f:
        return yaml.safe_load(f)


@lru_cache(maxsize=1)
def _load_priors() -> dict[str, float]:
    """Return {canonical/heading_variant_lower: confidence_prior}."""
    priors: dict[str, float] = {}
    path = _DATA_DIR / "heading_frequency.csv"
    with open(path, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            key = f"{row['canonical_section']}/{row['heading_variant'].lower().strip()}"
            try:
                priors[key] = float(row["confidence_prior"])
            except (ValueError, KeyError):
                pass
    return priors


@lru_cache(maxsize=1)
def _compiled_patterns() -> list[tuple[str, re.Pattern[str]]]:
    """Pre-compile all section heading regexes."""
    cfg = _load_patterns()
    results: list[tuple[str, re.Pattern[str]]] = []
    for section_name, section_cfg in cfg.get("canonical_sections", {}).items():
        for pat_str in section_cfg.get("patterns", []):
            try:
                results.append((section_name, re.compile(pat_str, re.IGNORECASE | re.MULTILINE)))
            except re.error:
                pass
    return results


def _heading_confidence(line: str, section_name: str) -> float:
    """Return confidence [0-1] for a line being the given section heading."""
    priors = _load_priors()
    key = f"{section_name}/{line.strip().lower()}"
    return priors.get(key, 0.72)


def _is_rejected(line: str, negative_rules: dict[str, Any]) -> bool:
    stripped = line.strip()
    max_chars: int = negative_rules.get("reject_if_too_long_chars", 48)
    max_words: int = negative_rules.get("reject_if_word_count_gt", 6)
    if len(stripped) > max_chars:
        return True
    if len(stripped.split()) > max_words:
        return True
    for term in negative_rules.get("reject_if_line_contains", []):
        if term in stripped:
            return True
    for pat_str in negative_rules.get("reject_if_matches", []):
        try:
            if re.search(pat_str, stripped, re.IGNORECASE):
                return True
        except re.error:
            pass
    return False


_SPACED_HEADING_RE = re.compile(
    r'^[ \t]*([A-Z](?:\s[A-Z]){3,}(?:\s{2,}[A-Z](?:\s[A-Z]){2,})*)[ \t]*$'
)

# Box-drawing and horizontal-rule characters often appended by PDF exporters
_HR_CHARS = (
    r'[\u2500-\u257F'   # Box Drawing block (─ ━ │ ┃ …)
    r'\u2014\u2015'      # em-dash, horizontal bar
    r'\u2013'            # en-dash
    r'\u0096\u0097'      # Windows-1252 dashes
    r'\-'               # plain hyphen
    r'\s]'
)
_HR_STRIP_RE = re.compile(rf'{_HR_CHARS}{{3,}}$')


def _strip_hr(line: str) -> str:
    """Remove trailing horizontal-rule / box-drawing sequences that PDF
    exporters (e.g. converting DOCX with rules to PDF) append to heading lines.

    Example: ``'EXPERIENCE  ──────────────────────────'``  →  ``'EXPERIENCE'``
    """
    return _HR_STRIP_RE.sub('', line).rstrip()


def _collapse_spaced_heading(line: str) -> str:
    """Collapse spaced-out headings like 'P R O F E S S I O N A L   E X P E R I E N C E'
    into 'PROFESSIONAL EXPERIENCE'."""
    m = _SPACED_HEADING_RE.match(line)
    if not m:
        return line
    core = m.group(1)
    # Split on runs of 2+ spaces to get individual words, then collapse single spaces
    words = re.split(r'\s{2,}', core)
    collapsed = " ".join(w.replace(" ", "") for w in words)
    return collapsed


# Pattern to detect concatenated heading words in all-caps (e.g., "PROFESSIONALEXPERIENCE")
_NO_SPACE_HEADING_RE = re.compile(
    r'^[ \t]*([A-Z]{2,})([A-Z][a-z]+(?:[A-Z][a-z]+)*)[ \t]*$'
    r'|^[ \t]*([A-Z][A-Z]+[A-Z][A-Z]+)[ \t]*$'  # All-caps concatenated words
)


def _expand_no_space_heading(line: str) -> str:
    """Expand concatenated heading words like 'PROFESSIONALEXPERIENCE' into
    'PROFESSIONAL EXPERIENCE' by inserting spaces before capitalized word boundaries.
    
    Only applies to lines that:
    - Are all uppercase
    - Have 10+ characters (to avoid false positives on acronyms like "CEO")
    - Contain common resume section keywords that indicate word boundaries
    
    Examples:
        'PROFESSIONALEXPERIENCE' → 'PROFESSIONAL EXPERIENCE'
        'TECHNICALSKILLS' → 'TECHNICAL SKILLS'
        'WORKHISTORY' → 'WORK HISTORY'
        'CEO' → 'CEO' (unchanged - too short)
        'Professional Experience' → 'Professional Experience' (unchanged - mixed case)
    """
    stripped = line.strip()
    
    # Only process all-caps lines with sufficient length
    if not stripped.isupper() or len(stripped) < 10:
        return line
    
    # List of common resume section word boundaries (longest first to match greedily)
    # These are substrings that indicate where to split concatenated words
    word_boundaries = [
        'PROFESSIONAL', 'EXPERIENCE', 'EMPLOYMENT', 'EDUCATION', 'QUALIFICATIONS',
        'BACKGROUND', 'TECHNICAL', 'SKILLS', 'COMPETENCIES', 'TECHNOLOGIES',
        'PLATFORMS', 'SOFTWARE', 'TOOLS', 'CERTIFICATIONS', 'LICENSES',
        'PROJECTS', 'SUMMARY', 'PROFILE', 'CONTACT', 'INFORMATION', 'DETAILS',
        'ADDITIONAL', 'PERSONAL', 'CAREER', 'HISTORY', 'WORK', 'ACADEMIC',
        'CORE', 'KEY', 'RELEVANT', 'SELECTED', 'NOTABLE'
    ]
    
    result = stripped
    # Process from longest to shortest to avoid partial matches
    for word in sorted(word_boundaries, key=len, reverse=True):
        # Insert space after this word if it's followed immediately by another capital letter
        # Use word boundary \b to ensure we match complete words
        pattern = re.compile(rf'\b({word})([A-Z])', re.IGNORECASE)
        result = pattern.sub(r'\1 \2', result)
    
    return result if result != stripped else line


_CONTINUATION_END_RE = re.compile(r'[&]$|\band\s*$', re.IGNORECASE)


def _next_non_empty(lines: list[str], start: int) -> tuple[int, str]:
    """Return (index, stripped_text) of the next non-empty line from *start*."""
    for j in range(start, len(lines)):
        s = lines[j].strip()
        if s:
            return j, s
    return -1, ""


def detect_sections(text: str) -> dict[str, str]:
    """
    Split resume text into canonical sections.

    Returns a dict mapping canonical section name → body text.
    Only sections with confidence >= MIN_CONFIDENCE and body >= MIN_BODY_CHARS are kept.

    When heading-based detection fails to find ``experience`` and/or ``education``
    (common for heading-less resumes), a content-based heuristic fallback is
    applied to infer them from date-range and education keyword cues.
    """
    cfg = _load_patterns()
    negative_rules = cfg.get("negative_rules", {})
    patterns = _compiled_patterns()

    lines = text.splitlines()
    # List of (line_index, last_consumed_line_index, canonical_section_name)
    boundaries: list[tuple[int, int, str]] = []
    consumed: set[int] = set()  # lines consumed as heading continuations

    for i, line in enumerate(lines):
        if not line.strip() or i in consumed:
            continue
        # Strip trailing box-drawing rules (e.g. "EXPERIENCE ─────────")
        cleaned = _strip_hr(line)
        # Expand concatenated headings (e.g. "PROFESSIONALEXPERIENCE" → "PROFESSIONAL EXPERIENCE")
        expanded = _expand_no_space_heading(cleaned)
        # Collapse spaced-out headings (e.g. "P R O F E S S I O N A L")
        normalized = _collapse_spaced_heading(expanded)

        # Multi-line heading: if line ends with '&' or 'and', merge the next line
        last_consumed = i
        if _CONTINUATION_END_RE.search(normalized.strip()):
            j, next_text = _next_non_empty(lines, i + 1)
            if j > 0 and next_text:
                normalized = normalized.rstrip().rstrip("&").strip() + " & " + _collapse_spaced_heading(next_text)
                last_consumed = j
                consumed.add(j)

        for section_name, pat in patterns:
            if pat.match(normalized):
                if _is_rejected(normalized, negative_rules):
                    break
                conf = _heading_confidence(normalized, section_name)
                if conf >= MIN_CONFIDENCE:
                    boundaries.append((i, last_consumed, section_name))
                break  # first matching section wins per line

    sections: dict[str, list[str]] = {}
    for idx, (line_idx, last_line, section_name) in enumerate(boundaries):
        start = last_line + 1
        end = boundaries[idx + 1][0] if idx + 1 < len(boundaries) else len(lines)
        body = "\n".join(lines[start:end]).strip()
        if len(body) >= MIN_BODY_CHARS:
            sections.setdefault(section_name, []).append(body)

    # Merge duplicate sections (e.g. multiple experience blocks)
    merged = {name: "\n\n".join(parts) for name, parts in sections.items()}

    # ── Heuristic fallback for heading-less resumes ───────────────────────────
    if not merged.get("experience") or not merged.get("education"):
        inferred = _infer_sections_heuristic(lines)
        for key in ("experience", "education"):
            if inferred.get(key) and not merged.get(key):
                merged[key] = inferred[key]

    return merged


# ── Heuristic (heading-less) fallback ────────────────────────────────────────

_EDUCATION_KEYWORDS_RE = re.compile(
    r'\b('
    r'university|college|school|institute|academy|polytechnic|'
    r'bsc|b\.sc|msc|m\.sc|ba\b|b\.a|ma\b|m\.a|mba|m\.b\.a|phd|ph\.d|'
    r'bachelor|master|doctorate|doctoral|'
    r'diploma|btec|gcse|gce|hnd|hnc|ond|'
    r'a[\- ]?level|o[\- ]?level|foundation\s+degree|'
    r'undergraduate|postgraduate|graduate|graduation|degree'
    r')\b',
    re.IGNORECASE,
)

_JOB_TITLE_KEYWORDS_RE = re.compile(
    r'\b('
    r'technician|engineer|developer|analyst|manager|consultant|officer|'
    r'specialist|coordinator|assistant|intern|architect|director|lead|'
    r'supervisor|designer|administrator|executive|associate|scientist|'
    r'researcher|programmer|tester|trainee|apprentice|operator|technologist|'
    r'agent|representative|advisor|adviser|auditor|accountant|clerk|'
    r'nurse|doctor|teacher|lecturer|professor|instructor|editor|writer|'
    r'founder|owner|partner|president|vice\s+president|vp\b|ceo|cto|cfo|coo'
    r')\b',
    re.IGNORECASE,
)

_DATE_RANGE_RE = re.compile(
    r'('
    r'\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?'
    r'(?:[\-\s]+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?)?'
    r'\s+\d{4}'  # "May 2023" or "May-June 2023"
    r'|\b\d{4}\s*[-–—]\s*(?:\d{4}|present|current)'  # "2019-2022"
    r'|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}\s*[-–—]\s*'
    r'(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}|present|current)'
    r'|\b\d{4}\b(?!\s*(?:st|nd|rd|th))'  # bare year (weaker signal, used with title)
    r')',
    re.IGNORECASE,
)


def _infer_sections_heuristic(lines: list[str]) -> dict[str, str]:
    """Infer ``experience`` and ``education`` blocks from content cues when
    no canonical heading was detected.

    Strategy: find the first education-cue line; everything from there to the
    end is education, and everything above it (after any leading contact/summary
    header) that shows date/job-title cues is treated as experience.
    """
    if not lines:
        return {}

    # Find the first line that looks like an education *entry* (tabular style:
    # "University of X  2019-2022" / "MSc Forensic Science"), not a summary
    # paragraph that merely mentions a degree. Education entries are short
    # and typically contain a year or an institution/degree noun near the start.
    edu_start: int | None = None
    for i, line in enumerate(lines):
        stripped = line.strip()
        if len(stripped) < 3 or len(stripped) > 180:
            continue
        # Skip prose: sentences with multiple periods or many words without year
        word_count = len(stripped.split())
        if word_count > 25:
            continue
        # Sentence-like prose (contains ". " mid-line) is almost never an entry
        if ". " in stripped[:-1]:
            continue
        if not _EDUCATION_KEYWORDS_RE.search(stripped):
            continue
        edu_start = i
        break

    # Determine experience start: first line (after line 0) that has a date or
    # a job-title cue, before edu_start.
    exp_start: int | None = None
    upper_bound = edu_start if edu_start is not None else len(lines)
    for i in range(0, upper_bound):
        stripped = lines[i].strip()
        if len(stripped) < 3:
            continue
        has_date = bool(_DATE_RANGE_RE.search(stripped))
        has_title = bool(_JOB_TITLE_KEYWORDS_RE.search(stripped))
        if has_date or has_title:
            exp_start = i
            break

    result: dict[str, str] = {}

    if exp_start is not None:
        exp_end = edu_start if edu_start is not None else len(lines)
        body = "\n".join(lines[exp_start:exp_end]).strip()
        if len(body) >= MIN_BODY_CHARS:
            result["experience"] = body

    if edu_start is not None:
        body = "\n".join(lines[edu_start:]).strip()
        if len(body) >= MIN_BODY_CHARS:
            result["education"] = body

    return result
