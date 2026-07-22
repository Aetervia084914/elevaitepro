"""Clean and normalize resume section text for structured output.

Applies encoding fixes, bullet normalization, whitespace cleanup, and
consistent line-break formatting so that work-experience and education
sections are in a polished, readable format.
"""
from __future__ import annotations

import re

# ── Bullet normalization ─────────────────────────────────────────────────────
# Map assorted bullet-like characters to a single Unicode bullet.
_BULLET_CHARS_RE = re.compile(
    r'^[\u2022\u2023\u25E6\u2043\u2219\u25AA\u25AB\u25CB\u25CF\u25D8'
    r'\u2013\u2014\u2015\u00B7\u2027\u29BF\u27A2\u27A4\u25B8\u25B6'
    r'\*\-]\s*',
    re.MULTILINE,
)

# ── Whitespace cleanup ───────────────────────────────────────────────────────
_MULTI_BLANK_RE = re.compile(r'\n{3,}')
_TRAILING_WS_RE = re.compile(r'[ \t]+$', re.MULTILINE)
_MULTI_SPACE_RE = re.compile(r' {2,}')

# ── Encoding artifacts ───────────────────────────────────────────────────────
_ENCODING_FIXES: list[tuple[str, str]] = [
    ('\u00a0', ' '),          # non-breaking space
    ('\u200b', ''),           # zero-width space
    ('\u200c', ''),           # zero-width non-joiner
    ('\u200d', ''),           # zero-width joiner
    ('\ufeff', ''),           # BOM
    ('\u2028', '\n'),         # line separator
    ('\u2029', '\n\n'),       # paragraph separator
    ('\r\n', '\n'),
    ('\r', '\n'),
]


def format_section(text: str) -> str:
    """Return a clean, consistently formatted version of *text*."""
    if not text:
        return ""

    # Fix encoding artifacts
    for old, new in _ENCODING_FIXES:
        text = text.replace(old, new)

    # Normalize bullets to •
    text = _BULLET_CHARS_RE.sub('• ', text)

    # Collapse inline multi-spaces (except leading indent)
    lines = []
    for line in text.split('\n'):
        stripped = line.lstrip()
        indent = line[:len(line) - len(stripped)]
        lines.append(indent + _MULTI_SPACE_RE.sub(' ', stripped))
    text = '\n'.join(lines)

    # Collapse 3+ consecutive blank lines → 1 blank line
    text = _MULTI_BLANK_RE.sub('\n\n', text)

    # Remove trailing whitespace per line
    text = _TRAILING_WS_RE.sub('', text)

    return text.strip()


def format_work_experience(text: str) -> str:
    """Format work-experience section for clean, structured output."""
    return format_section(text)


def format_education(text: str) -> str:
    """Format education section for clean, structured output."""
    return format_section(text)
