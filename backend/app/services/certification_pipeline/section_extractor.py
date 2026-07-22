"""
Section Extractor — Isolate the Certifications section from resume text.

Scans for common certification-section headers, then captures everything
from that header until the next section header (or end-of-text).

If no certification section is detected, returns None so the caller can
decide the fallback strategy.
"""
from __future__ import annotations

import logging
import re

logger = logging.getLogger(__name__)

# ── Section header patterns ──
# Matches lines that look like section headers in resumes.
# Covers: "CERTIFICATIONS", "Certifications & Licenses", "Certificates",
# "Professional Certifications", "Licenses & Certifications",
# "Certifications and Training", "Credentials", etc.

_CERT_SECTION_RE = re.compile(
    r"(?i)"                          # case-insensitive
    r"^[ \t]*"                       # optional leading whitespace
    r"("
    r"(?:professional\s+)?"
    r"certif(?:ications?|icates?)"
    r"(?:\s*(?:&|and)\s*(?:licenses?|training|credentials?|awards?))?"
    r"|licenses?\s*(?:&|and)\s*certif(?:ications?|icates?)"
    r"|credentials?"
    r")"
    r"[ \t]*:?[ \t]*$",             # optional colon, end of line
    re.MULTILINE,
)

# Generic section header — a line that looks like a new section.
# Short all-caps lines, or title-case lines that are typical resume headers.
_NEXT_SECTION_RE = re.compile(
    r"(?i)"
    r"^[ \t]*"
    r"("
    r"(?:professional\s+)?experience"
    r"|(?:work|employment)\s+(?:experience|history)"
    r"|education"
    r"|skills"
    r"|(?:technical\s+)?skills?\s*(?:&|and)?\s*(?:tools|technologies|competencies)?"
    r"|summary"
    r"|(?:professional\s+)?summary"
    r"|objective"
    r"|projects?"
    r"|publications?"
    r"|awards?\s*(?:&|and)?\s*(?:honors?|achievements?)?"
    r"|honors?"
    r"|volunteer(?:ing)?"
    r"|interests?"
    r"|hobbies"
    r"|references?"
    r"|languages?"
    r"|activities"
    r"|affiliations?"
    r"|(?:professional\s+)?memberships?"
    r"|training"
    r"|courses?"
    r"|additional\s+information"
    r"|personal\s+(?:information|details?)"
    r")"
    r"[ \t]*:?[ \t]*$",
    re.MULTILINE,
)


def extract_certification_section(text: str) -> tuple[str | None, int | None, int | None]:
    """
    Extract the certification section from resume text.

    Returns:
        (section_text, start_offset, end_offset)
        or (None, None, None) if no certification section found.

    start_offset / end_offset are character positions relative to the
    original text so that match positions can be mapped back.
    """
    match = _CERT_SECTION_RE.search(text)
    if not match:
        logger.debug("No certification section header found in text")
        return None, None, None

    # Section body starts after the header line
    section_start = match.end()

    # Skip any blank lines right after the header
    while section_start < len(text) and text[section_start] in ("\n", "\r", " ", "\t"):
        section_start += 1

    # Find the next section header after the cert section
    remaining = text[section_start:]
    next_section = _NEXT_SECTION_RE.search(remaining)

    if next_section:
        section_end = section_start + next_section.start()
    else:
        section_end = len(text)

    section_text = text[section_start:section_end].strip()

    if not section_text:
        logger.debug("Certification section header found but body is empty")
        return None, None, None

    logger.info(
        "Certification section extracted: chars %d-%d (%d chars)",
        section_start, section_end, len(section_text),
    )

    return section_text, section_start, section_end
