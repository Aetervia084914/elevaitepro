"""Extract candidate contact information (name, email, phone) from resume text.

Uses regex for email/phone and a heuristic for candidate name extraction.
spaCy dependency removed.
"""
from __future__ import annotations

import importlib.util
import logging
import os
import re
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

_EXTRACTNAME_PATH = Path(__file__).resolve().parents[3] / "extractname.py"
_EXTRACT_NAME_FROM_FILE = None

if _EXTRACTNAME_PATH.exists():
    try:
        spec = importlib.util.spec_from_file_location("extractname", _EXTRACTNAME_PATH)
        if spec and spec.loader:
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            _EXTRACT_NAME_FROM_FILE = getattr(module, "extract_name", None)
    except Exception as exc:
        logger.warning("Could not load file-based name extractor: %s", exc)

# ── Email ────────────────────────────────────────────────────────────────────

_EMAIL_RE = re.compile(
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'
)

# ── Phone ────────────────────────────────────────────────────────────────────

_PHONE_PATTERNS = [
    re.compile(r'\+\d{1,3}[\s.-]?\(?\d{1,5}\)?[\s.-]?\d{3,5}[\s.-]?\d{3,5}'),
    re.compile(r'\(\d{3,5}\)[\s.-]?\d{3,4}[\s.-]?\d{3,4}'),
    re.compile(r'\b0?\d{3,5}[\s.-]\d{3,4}[\s.-]?\d{3,4}\b'),
    re.compile(r'\b\d{10,13}\b'),
]

# ── Filters for name heuristic ──────────────────────────────────────────────

_URL_RE = re.compile(r'https?://|www\.|linkedin\.com|github\.com', re.IGNORECASE)

_NOISE_LINE_RE = re.compile(
    r'curriculum\s+vitae|resume|address|phone|email|mobile|tel[:\s]|'
    r'objective|summary|profile|experience|education|skills?|'
    r'references|available|date\s+of\s+birth|nationality|dob|'
    r'linkedin|github|portfolio|page\s+\d|'
    r'contact|certif|training|tech\s+skill|'
    r'leadership|collaboration|problem.solving|critical\s+thinking|'
    r'project\s+planning|communication|teamwork|creativity|'
    r'engineer|manager|developer|analyst|consultant|architect|'
    r'university|college|institute|school|academy|'
    r'm\.?sc|b\.?sc|b\.?e\b|m\.?a\b|b\.?a\b|ph\.?d|mba|diploma|'
    r'\b\d{4}\b',
    re.IGNORECASE,
)

_LOCATION_RE = re.compile(
    r'\b('
    r'united\s+kingdom|united\s+states|united\s+arab|'
    r'london|manchester|birmingham|leeds|glasgow|edinburgh|liverpool|bristol|'
    r'new\s+york|los\s+angeles|chicago|houston|san\s+francisco|seattle|'
    r'nigeria|lagos|abuja|accra|nairobi|johannesburg|cape\s+town|'
    r'canada|australia|germany|france|india|dubai|singapore|'
    r'england|scotland|wales|ireland|'
    r'county|state|province|city|town|district'
    r')\b',
    re.IGNORECASE,
)


# ── Public API ───────────────────────────────────────────────────────────────

def extract_email(text: str) -> str:
    match = _EMAIL_RE.search(text[:3000])
    return match.group(0).strip() if match else ""


def extract_phone(text: str) -> str:
    header = text[:3000]
    for pat in _PHONE_PATTERNS:
        match = pat.search(header)
        if match:
            phone = match.group(0).strip()
            if len(re.sub(r'\D', '', phone)) >= 7:
                return phone
    return ""


def extract_name(text: str) -> str:
    """Extract candidate name using heuristic — first short, mostly-alphabetic line."""
    search_text = text[:3000]

    # Log first lines for diagnostic purposes
    first_lines = [l.strip() for l in search_text.split('\n')[:10] if l.strip()]
    logger.info("[name-extract] first 10 non-empty lines: %r", first_lines)

    for line in search_text.split('\n')[:50]:
        stripped = line.strip()
        if not stripped or len(stripped) < 3 or len(stripped) > 60:
            continue
        if _EMAIL_RE.search(stripped):
            continue
        if any(p.search(stripped) for p in _PHONE_PATTERNS):
            continue
        if _URL_RE.search(stripped):
            continue
        if _NOISE_LINE_RE.search(stripped):
            continue
        if _LOCATION_RE.search(stripped):
            continue
        if ',' in stripped:
            continue
        if re.search(r'[&#+@/\\|:;(){}\[\]<>]', stripped):
            continue
        alpha_ratio = sum(
            c.isalpha() or c.isspace() or c in "'-."
            for c in stripped
        ) / len(stripped)
        if alpha_ratio < 0.85:
            continue
        words = stripped.split()
        if 2 <= len(words) <= 5 and all(w[0].isupper() for w in words if w):
            return stripped

    # Fallback: try splitting lines on pipe/dash/bullet separators and check
    # each segment individually (handles "NSIKAK AIE | Software Engineer")
    for line in search_text.split('\n')[:30]:
        stripped = line.strip()
        if not stripped or len(stripped) < 3:
            continue
        segments = re.split(r'\s*[|•·–—]\s*', stripped)
        for seg in segments:
            seg = seg.strip()
            if not seg or len(seg) < 3 or len(seg) > 50:
                continue
            if _EMAIL_RE.search(seg) or _URL_RE.search(seg):
                continue
            if any(p.search(seg) for p in _PHONE_PATTERNS):
                continue
            if _NOISE_LINE_RE.search(seg):
                continue
            if _LOCATION_RE.search(seg):
                continue
            alpha_ratio = sum(
                c.isalpha() or c.isspace() or c in "'-."
                for c in seg
            ) / len(seg)
            if alpha_ratio < 0.85:
                continue
            words = seg.split()
            if 2 <= len(words) <= 5 and all(w[0].isupper() for w in words if w):
                return seg

    # Last resort: relaxed pass — purely alphabetic 2-4 word lines (no noise
    # filter) that appear before the first detected section heading.  This
    # catches names on lines the aggressive noise regex discards.
    for line in search_text.split('\n')[:20]:
        stripped = line.strip()
        if not stripped or len(stripped) < 4 or len(stripped) > 50:
            continue
        if _EMAIL_RE.search(stripped) or _URL_RE.search(stripped):
            continue
        if any(p.search(stripped) for p in _PHONE_PATTERNS):
            continue
        if re.search(r'[&#+@/\\|:;(){}\[\]<>0-9,]', stripped):
            continue
        if _LOCATION_RE.search(stripped):
            continue
        words = stripped.split()
        if not (2 <= len(words) <= 4):
            continue
        if all(re.fullmatch(r"[A-Za-z'-]+", w) for w in words) and all(w[0].isupper() for w in words):
            logger.info("[name-extract] relaxed fallback matched: %r", stripped)
            return stripped

    logger.warning(
        "[name-extract] could not find candidate name in first 50 lines; "
        "first 5 lines: %r",
        [l.strip() for l in search_text.split('\n')[:5] if l.strip()],
    )
    return ""


def extract_linkedin(text: str) -> str:
    header = text[:5000]
    match = re.search(
        r'(?:https?://)?(?:www\.)?linkedin\.com/in/[A-Za-z0-9_-]+/?',
        header,
        re.IGNORECASE,
    )
    if match:
        url = match.group(0).strip().rstrip('/')
        if not url.startswith('http'):
            url = 'https://' + url
        return url
    return ""


_GITHUB_RE = re.compile(
    r'(?:https?://)?(?:www\.)?github\.com/[a-zA-Z0-9_\-%]+(?:/[a-zA-Z0-9_\-%]+)*',
    re.IGNORECASE,
)

_WEBSITE_RE = re.compile(
    r'(?:https?://)(?:www\.)?[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}(?:/[^\s,;)]*)?',
    re.IGNORECASE,
)


def extract_github(text: str) -> str:
    header = text[:5000]
    for m in _GITHUB_RE.finditer(header):
        url = m.group(0).strip().rstrip('.,;:)>')
        if not url.startswith('http'):
            url = 'https://' + url
        return url
    return ""


def extract_website(text: str, linkedin: str = "", github: str = "") -> str:
    header = text[:5000]
    for m in _WEBSITE_RE.finditer(header):
        url = m.group(0).strip().rstrip('.,;:)>')
        if 'linkedin.com' in url.lower():
            continue
        if 'github.com' in url.lower():
            continue
        return url
    return ""


def _extract_name_from_uploaded_file(file_name: str | None, file_bytes: bytes | None) -> str:
    if not file_name or not file_bytes or _EXTRACT_NAME_FROM_FILE is None:
        return ""

    ext = Path(file_name).suffix.lower()
    if ext not in {".pdf", ".docx"}:
        return ""

    temp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as handle:
            handle.write(file_bytes)
            temp_path = handle.name

        extracted_name = _EXTRACT_NAME_FROM_FILE(temp_path)
        if isinstance(extracted_name, str):
            extracted_name = extracted_name.strip()
            if extracted_name:
                return extracted_name
    except Exception as exc:
        logger.warning("[name-extract] file-based extraction failed for %s: %s", file_name, exc)
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass

    return ""


def extract_contact_info(
    raw_text: str,
    file_name: str | None = None,
    file_bytes: bytes | None = None,
) -> dict[str, str]:
    file_based_name = _extract_name_from_uploaded_file(file_name, file_bytes)
    text_based_name = extract_name(raw_text)
    linkedin = extract_linkedin(raw_text)
    github = extract_github(raw_text)

    return {
        "name": file_based_name or text_based_name,
        "email": extract_email(raw_text),
        "phone": extract_phone(raw_text),
        "linkedin": linkedin,
        "github": github,
        "website": extract_website(raw_text, linkedin, github),
    }
