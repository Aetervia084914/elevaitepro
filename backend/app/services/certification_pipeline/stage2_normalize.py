"""
Stage 2 - Raw Text Normalization & Alias-Safe Cleaning

Input:  raw_text from Stage 1.
Output: cleaned_text - normalized flat string, alias-safe, ready for matching.

No section detection. The full text string is preserved intact.

Normalization steps:
  1. unicodedata.normalize("NFC", text) - canonical composition.
  2. ftfy.fix_text() - encoding mojibake repair (PDF artifacts).
  3. Strip null bytes, zero-width chars, BOM.
  4. Replace curly quotes to straight, em-dash to hyphen-space.
  5. Collapse runs of whitespace/newlines to single space.

Special Char Guard:
  Alias values like "CompTIA Security+" contain +, "C++" double-plus,
  "PHR/SPHR" slash. A pre-built alias_token_whitelist derived from the
  DB alias column at startup prevents these characters from being
  stripped or normalized away. Any token that appears as a substring
  of any known alias passes through unchanged.
"""
from __future__ import annotations

import logging
import re
import time
import unicodedata
from typing import Any

import ftfy

from app.services.certification_pipeline.schemas import Stage2Output

logger = logging.getLogger(__name__)

# -- Zero-width and control characters to strip --
_STRIP_CHARS = re.compile(
    "["
    "\u0000"        # null
    "\u00ad"        # soft hyphen
    "\u200b"        # zero-width space
    "\u200c"        # zero-width non-joiner
    "\u200d"        # zero-width joiner
    "\u200e"        # left-to-right mark
    "\u200f"        # right-to-left mark
    "\u2028"        # line separator
    "\u2029"        # paragraph separator
    "\ufeff"        # BOM / zero-width no-break space
    "\ufff9"        # interlinear annotation anchor
    "\ufffa"        # interlinear annotation separator
    "\ufffb"        # interlinear annotation terminator
    "]+",
    re.UNICODE,
)

# -- Smart quote / dash replacements --
_SMART_REPLACEMENTS: list[tuple[str, str]] = [
    ("\u2018", "'"),   # left single quote
    ("\u2019", "'"),   # right single quote
    ("\u201c", '"'),   # left double quote
    ("\u201d", '"'),   # right double quote
    ("\u2013", "-"),   # en-dash
    ("\u2014", "- "),  # em-dash -> hyphen-space
    ("\u2026", "..."), # ellipsis
    ("\uff0b", "+"),   # fullwidth plus -> ASCII plus
    ("\uff0f", "/"),   # fullwidth slash -> ASCII slash
    ("\uff03", "#"),   # fullwidth hash -> ASCII hash
    ("\uff0e", "."),   # fullwidth period -> ASCII period
]

# -- Ligature fixes (common in PDF extraction) --
_LIGATURE_MAP: dict[str, str] = {
    "\ufb01": "fi",
    "\ufb02": "fl",
    "\ufb03": "ffi",
    "\ufb04": "ffl",
}

# -- Whitespace collapse: runs of spaces/tabs -> single space --
_WHITESPACE_RUN = re.compile(r"[ \t]+")
# -- Newline collapse: 3+ newlines -> 2 --
_NEWLINE_RUN = re.compile(r"\n{3,}")
# -- Trailing whitespace per line --
_TRAILING_WS = re.compile(r"[ \t]+\n")


def _build_protected_pattern(alias_tokens: set[str]) -> re.Pattern | None:
    """
    Build a regex pattern that matches any alias token containing special chars.
    These tokens are protected from character stripping during normalization.
    Returns None if no tokens need protection.
    """
    if not alias_tokens:
        return None
    # Only protect tokens that contain characters which might be affected
    special = {t for t in alias_tokens if any(c in t for c in "+-/.#&")}
    if not special:
        return None
    # Sort by length descending so longer tokens match first
    sorted_tokens = sorted(special, key=len, reverse=True)
    escaped = [re.escape(t) for t in sorted_tokens]
    return re.compile("|".join(escaped), re.IGNORECASE)


def _apply_ligature_fixes(text: str) -> tuple[str, int]:
    """Replace common PDF ligature characters with ASCII equivalents."""
    count = 0
    for lig, replacement in _LIGATURE_MAP.items():
        if lig in text:
            n = text.count(lig)
            text = text.replace(lig, replacement)
            count += n
    return text, count


def _apply_smart_replacements(text: str) -> tuple[str, int]:
    """Replace smart quotes, fancy dashes, fullwidth chars with ASCII equivalents."""
    count = 0
    for orig, repl in _SMART_REPLACEMENTS:
        if orig in text:
            n = text.count(orig)
            text = text.replace(orig, repl)
            count += n
    return text, count


def _strip_control_chars(text: str) -> tuple[str, int]:
    """Strip zero-width, null, and invisible control characters."""
    matches = _STRIP_CHARS.findall(text)
    count = sum(len(m) for m in matches)
    text = _STRIP_CHARS.sub("", text)
    return text, count


def _collapse_whitespace(text: str) -> str:
    """Collapse whitespace runs and normalize newlines."""
    text = _TRAILING_WS.sub("\n", text)
    text = _WHITESPACE_RUN.sub(" ", text)
    text = _NEWLINE_RUN.sub("\n\n", text)
    return text.strip()


async def stage2_normalize(
    raw_text: str,
    alias_tokens: set[str] | None = None,
) -> Stage2Output:
    """
    Stage 2: Raw Text Normalization & Alias-Safe Cleaning.

    1. NFC Unicode normalization (canonical composition).
    2. ftfy mojibake repair.
    3. Ligature replacement (fi, fl, ffi, ffl).
    4. Strip zero-width / control characters.
    5. Smart quote and dash normalization.
    6. Fullwidth -> ASCII for +, /, #, .
    7. Collapse whitespace and newlines.

    alias_tokens: set of lowercase alias substrings from the DB.
    Tokens matching these are protected from normalization that could
    alter their special characters (e.g. + in Security+).

    Returns Stage2Output with cleaned_text and metadata.
    """
    t0 = time.perf_counter()

    if not raw_text or not raw_text.strip():
        raise ValueError("Stage 2 received empty raw_text")

    char_count_before = len(raw_text)
    normalizations_applied: list[str] = []

    # Build alias protection pattern
    protected_pattern = _build_protected_pattern(alias_tokens or set())
    protected_spans: list[tuple[int, int, str]] = []

    # -- Step 1: NFC normalization --
    text = unicodedata.normalize("NFC", raw_text)
    if text != raw_text:
        normalizations_applied.append("nfc")

    # -- Step 2: ftfy mojibake repair --
    text_pre = text
    text = ftfy.fix_text(text)
    if text != text_pre:
        normalizations_applied.append("ftfy_mojibake")

    # -- Step 3: Ligature fixes --
    text, lig_count = _apply_ligature_fixes(text)
    if lig_count > 0:
        normalizations_applied.append(f"ligatures({lig_count})")

    # -- Protect alias tokens before destructive normalization --
    # Find and temporarily mark protected spans
    placeholder_map: dict[str, str] = {}
    if protected_pattern:
        idx = 0
        for match in protected_pattern.finditer(text):
            placeholder = f"\uE000PROT{idx}\uE001"
            placeholder_map[placeholder] = match.group()
            idx += 1
        # Replace protected tokens with placeholders (longest first via regex)
        if placeholder_map:
            inv_map = {}
            pidx = 0
            for match in protected_pattern.finditer(text):
                ph = f"\uE000PROT{pidx}\uE001"
                inv_map[ph] = match.group()
                pidx += 1
            # Do replacements
            new_text = []
            last_end = 0
            for match in protected_pattern.finditer(text):
                new_text.append(text[last_end:match.start()])
                ph = f"\uE000PROT{len(protected_spans)}\uE001"
                protected_spans.append((match.start(), match.end(), match.group()))
                placeholder_map[ph] = match.group()
                new_text.append(ph)
                last_end = match.end()
            new_text.append(text[last_end:])
            text = "".join(new_text)

    # -- Step 4: Strip control / zero-width characters --
    text, ctrl_count = _strip_control_chars(text)
    if ctrl_count > 0:
        normalizations_applied.append(f"strip_control({ctrl_count})")

    # -- Step 5: Smart quotes / dashes --
    text, smart_count = _apply_smart_replacements(text)
    if smart_count > 0:
        normalizations_applied.append(f"smart_chars({smart_count})")

    # -- Step 6: Collapse whitespace --
    text_pre = text
    text = _collapse_whitespace(text)
    if text != text_pre.strip():
        normalizations_applied.append("whitespace_collapse")

    # -- Restore protected tokens --
    for ph, original in placeholder_map.items():
        text = text.replace(ph, original)

    char_count_after = len(text)
    elapsed_ms = (time.perf_counter() - t0) * 1000

    stageoutput: dict[str, Any] = {
        "char_count_before": char_count_before,
        "char_count_after": char_count_after,
        "chars_removed": char_count_before - char_count_after,
        "normalizations_applied": normalizations_applied,
        "alias_tokens_protected": len(protected_spans),
        "execution_ms": round(elapsed_ms, 2),
    }

    logger.info(
        "Stage 2 complete: %d -> %d chars, %d normalizations, %.1fms",
        char_count_before, char_count_after, len(normalizations_applied), elapsed_ms,
    )

    return Stage2Output(
        cleaned_text=text,
        stageoutput=stageoutput,
    )
