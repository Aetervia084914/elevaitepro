"""Calculate total years of professional experience from resume text."""
from __future__ import annotations

import re
from datetime import date

_TODAY = date.today

_MONTH_MAP: dict[str, int] = {
    # English - Full names
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
    # English - 3-letter abbreviations
    "jan": 1, "feb": 2, "mar": 3, "apr": 4,
    "may": 5, "jun": 6, "jul": 7, "aug": 8,
    "sep": 9, "oct": 10, "nov": 11, "dec": 12,
    # English - Alternative abbreviations
    "sept": 9,
    # Season indicators (approximate)
    "spring": 3, "summer": 6, "fall": 9, "autumn": 9, "winter": 12,
    # Quarter indicators (approximate to mid-quarter)
    "q1": 2, "q2": 5, "q3": 8, "q4": 11,
}

_PRESENT = re.compile(
    r"^(?:present|current|now|today|ongoing|till(?:[-\s]+)?date|to\s+date|up\s+to\s+date|continuing|active)$",
    re.IGNORECASE,
)
_PRESENT_TEXT = re.compile(
    r"\b(?:present|current|now|today|ongoing|till(?:[-\s]+)?date|to\s+date|up\s+to\s+date|continuing|active)\b",
    re.IGNORECASE,
)

# Date-range patterns ordered from most to least specific
# Covers: "Jan 2020 – Mar 2023", "01/2020 - 03/2023", "2020-2023", "Jan'20", etc.
_PATTERNS: list[re.Pattern[str]] = [
    # ═══ Month Name + Full Year ═══
    # "January 2020 – March 2023" | "Jan 2020 - Present" | "Jan 2020 – Mar 23"
    re.compile(
        r"\b(?P<sm>[A-Za-z]{3,9})\s+(?P<sy>\d{4})\s*[-–—~|to|TO]\s*"
        r"(?:(?P<em>[A-Za-z]{3,9})\s+)?(?P<ey>\d{2,4}|[A-Za-z]+)\b",
        re.IGNORECASE,
    ),
    
    # ═══ MM/YYYY or MM-YYYY Format ═══
    # "03/2020 – 06/2023" | "03-2020 - Present" | "3/2020 - 6/23"
    re.compile(
        r"\b(?P<sm>\d{1,2})[/\-.](?P<sy>\d{4})\s*[-–—~|to|TO]\s*"
        r"(?:(?P<em>\d{1,2})[/\-.])?(?P<ey>\d{2,4}|[A-Za-z]+)\b",
        re.IGNORECASE,
    ),
    
    # ═══ YYYY-MM or YYYY/MM Format ═══
    # "2020-03 – 2023-06" | "2020/03 - 2023/06"
    re.compile(
        r"\b(?P<sy>\d{4})[/\-.](?P<sm>\d{1,2})\s*[-–—~|to|TO]\s*"
        r"(?P<ey>\d{4})[/\-.](?P<em>\d{1,2})\b",
        re.IGNORECASE,
    ),
    
    # ═══ Abbreviated Year Format ═══
    # "Jan'20 – Mar'23" | "01/20 - 03/23" | "Jan'20-Mar'23"
    re.compile(
        r"\b(?P<sm>[A-Za-z]{3,9})[''](?P<sy>\d{2})\s*[-–—~]\s*"
        r"(?P<em>[A-Za-z]{3,9})[''](?P<ey>\d{2})\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?P<sm>\d{1,2})[/\-.](?P<sy>\d{2})\s*[-–—~]\s*"
        r"(?P<em>\d{1,2})[/\-.](?P<ey>\d{2})\b",
        re.IGNORECASE,
    ),
    
    # ═══ Bare 2-digit Year Format (no apostrophe) ═══
    # "Jul 25 – Present" | "Jan 25 – Jun 25" | "Nov 20 – Dec 24"
    # Must match month name + space + exactly 2 digits + range separator to avoid false positives
    # Will NOT match: "Page 2 of 25", "Section 25", phone numbers, zip codes
    # Uses lookahead to ensure end value is followed by whitespace or end-of-string
    re.compile(
        r"\b(?P<sm>[A-Za-z]{3,9})\s+(?P<sy>\d{2})\s*[-–—~|to|TO]\s*"
        r"(?:(?P<em>[A-Za-z]{3,9})\s+)?(?P<ey>\d{2}|Present|Current|Now|Ongoing)(?=\s|$)",
        re.IGNORECASE,
    ),
    
    # ═══ Year Only Format (with various separators) ═══
    # "2018 – 2022" | "2020-2023" | "2020–Present" | "2019 to 2022"
    re.compile(
        r"\b(?P<sy>\d{4})\s*[-–—~|to|TO]\s*(?P<ey>\d{4}|[A-Za-z]+)\b",
        re.IGNORECASE,
    ),
    # "2020-2023" (no spaces - common in CVs)
    re.compile(
        r"\b(?P<sy>\d{4})[-–—](?P<ey>\d{4}|[A-Za-z]+)\b",
        re.IGNORECASE,
    ),
    
    # ═══ Quarter Format ═══
    # "Q1 2020 – Q3 2023" | "Q1'20 - Q3'23"
    re.compile(
        r"\b(?P<sm>[Qq]\d)\s*['']?\s*(?P<sy>\d{2,4})\s*[-–—~]\s*"
        r"(?P<em>[Qq]\d)\s*['']?\s*(?P<ey>\d{2,4})\b",
        re.IGNORECASE,
    ),
    
    # ═══ Season Format ═══
    # "Spring 2020 – Fall 2023" | "Summer'20 - Winter'22"
    re.compile(
        r"\b(?P<sm>Spring|Summer|Fall|Autumn|Winter)\s*['']?\s*(?P<sy>\d{2,4})\s*[-–—~]\s*"
        r"(?P<em>Spring|Summer|Fall|Autumn|Winter)\s*['']?\s*(?P<ey>\d{2,4}|[A-Za-z]+)\b",
        re.IGNORECASE,
    ),
    
    # ═══ Full Date Format ═══
    # "01 Jan 2020 – 15 Mar 2023" | "1st January 2020 - Present"
    re.compile(
        r"\b\d{1,2}(?:st|nd|rd|th)?\s+(?P<sm>[A-Za-z]{3,9})\s+(?P<sy>\d{4})\s*[-–—~]\s*"
        r"(?:\d{1,2}(?:st|nd|rd|th)?\s+)?(?P<em>[A-Za-z]{3,9})\s+(?P<ey>\d{4}|[A-Za-z]+)\b",
        re.IGNORECASE,
    ),
    
    # ═══ ISO Date Format ═══
    # "2020-01-15 – 2023-03-20"
    re.compile(
        r"\b(?P<sy>\d{4})-(?P<sm>\d{2})-\d{2}\s*[-–—~]\s*"
        r"(?P<ey>\d{4})-(?P<em>\d{2})-\d{2}\b",
        re.IGNORECASE,
    ),
    
    # ═══ Month-Year Without Separator ═══
    # "Jan2020 – Mar2023" (sometimes OCR artifacts)
    re.compile(
        r"\b(?P<sm>[A-Za-z]{3,9})(?P<sy>\d{4})\s*[-–—~]\s*"
        r"(?P<em>[A-Za-z]{3,9})(?P<ey>\d{4}|[A-Za-z]+)\b",
        re.IGNORECASE,
    ),
]


def _parse_month(val: str) -> int:
    if val.isdigit():
        return max(1, min(12, int(val)))
    return _MONTH_MAP.get(val.lower(), 1)


def _parse_year(val: str) -> int | None:
    """Parse year value, handling 2-digit and 4-digit years, and 'Present'."""
    if _PRESENT.match(val.strip()):
        return _TODAY().year
    try:
        y = int(val)
        # Handle 2-digit years (20 = 2020, 99 = 1999, 00 = 2000)
        if y < 100:
            # Assume 00-40 are 2000-2040, 41-99 are 1941-1999
            if y <= 40:
                y += 2000
            else:
                y += 1900
        return y if 1950 < y <= _TODAY().year + 1 else None
    except ValueError:
        return None


def _extract_intervals(text: str) -> list[tuple[date, date]]:
    """Extract all date intervals from resume text using multiple pattern matching strategies."""
    intervals: list[tuple[date, date]] = []
    seen: set[tuple[date, date]] = set()

    # Normalize "Present" variations for consistent matching
    normalized_text = _PRESENT_TEXT.sub("Present", text)
    
    for pat in _PATTERNS:
        for m in pat.finditer(normalized_text):
            g = m.groupdict(default="")
            try:
                # ═══ Parse Start Date ═══
                sy_raw = g.get("sy", "").strip()
                if not sy_raw:
                    continue
                    
                sy = _parse_year(sy_raw)
                if sy is None:
                    continue
                
                sm = _parse_month(g.get("sm") or "1")
                start = date(sy, sm, 1)
                
                # ═══ Parse End Date ═══
                end_value = (g.get("ey") or "").strip()
                
                # Handle "Present" / "Current" etc.
                if _PRESENT.match(end_value):
                    end = _TODAY()
                else:
                    ey = _parse_year(end_value)
                    if ey is None:
                        continue
                    em = _parse_month(g.get("em") or "12")
                    end = date(ey, em, 1)
                
                # ═══ Validation ═══
                # Reject invalid intervals
                if start > end:
                    # Try swapping if it makes sense (sometimes dates are reversed)
                    if end.year >= 1950:
                        start, end = end, start
                    else:
                        continue
                
                if sy < 1950 or sy > _TODAY().year + 1:
                    continue
                
                # Reject intervals spanning more than 60 years (likely OCR error)
                if (end - start).days > 365 * 60:
                    continue
                
                # ═══ Add to Results ═══
                pair = (start, end)
                if pair not in seen:
                    seen.add(pair)
                    intervals.append(pair)
                    
            except (ValueError, KeyError, OverflowError) as exc:
                # Skip malformed dates silently
                continue

    return intervals


def _merge_intervals(intervals: list[tuple[date, date]]) -> list[tuple[date, date]]:
    if not intervals:
        return []
    sorted_ivs = sorted(intervals)
    merged: list[list[date]] = [list(sorted_ivs[0])]
    for start, end in sorted_ivs[1:]:
        if start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return [(s, e) for s, e in merged]


def calculate_years(work_text: str) -> float:
    """
    Return total years of experience (rounded to 1 decimal).

    Raises ValueError('years_of_experience_not_determined') when no
    valid date ranges can be found — caller should surface this to the user.
    """
    intervals = _extract_intervals(work_text)
    if not intervals:
        raise ValueError("years_of_experience_not_determined")
    merged = _merge_intervals(intervals)
    total_days = sum((e - s).days for s, e in merged)
    years = round(total_days / 365.25, 1)
    if years <= 0:
        raise ValueError("years_of_experience_not_determined")
    return years
