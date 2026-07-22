"""Extract work experience entries preserving original text exactly as written.

ARCHITECTURE PRINCIPLE:
- NO spaCy, NO LLM rewriting, NO title/company field separation
- ONLY boundary detection using date patterns
- Preserve EVERYTHING: original bullets, spacing, line breaks, wording
- The raw_block field is the source of truth, not derived fields
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from dateutil import parser as dateutil_parser

# Reuse the same date range pattern from section_detector.py for consistency
# PLUS add patterns that specifically match FULL date ranges
_DATE_RANGE_RE = re.compile(
    r'('
    # Full date ranges (Month Year - Month Year)
    r'\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}\s*[-–—]\s*'
    r'(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}|present|current)'
    r'|'
    # Year ranges
    r'\b\d{4}\s*[-–—]\s*(?:\d{4}|present|current)'
    r'|'
    # MM/YYYY ranges
    r'\b\d{2}\s*/\s*\d{4}\s*[-–—]\s*(?:\d{2}\s*/\s*\d{4}|present|current)'
    r'|'
    # Single month-year (weaker - only if standalone)
    r'\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}(?=\s*$)'
    r'|'
    # Bare year (weakest signal)
    r'\b\d{4}\b(?!\s*(?:st|nd|rd|th))'
    r')',
    re.IGNORECASE,
)

# Additional patterns for 2-digit years (Jul 25 - Present)
_DATE_RANGE_BARE_2DIGIT_RE = re.compile(
    r'\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{2}\s*[-–—]\s*'
    r'(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{2}|present|current)',
    re.IGNORECASE,
)


@dataclass
class WorkExperienceEntry:
    """A single work experience entry with original text preserved.
    
    Attributes:
        raw_block: The complete, untouched text block for this entry including
                   job title, company, dates, bullets, descriptions - exactly
                   as it appears in the CV. This is the PRIMARY field.
        date_line: The specific line that triggered the boundary detection
                   (contains the date range). Used only for sorting, never
                   displayed to user. Can be None if no clear date found.
        start_date: Parsed start date from date_line. Used ONLY for timeline
                    ordering, never shown to user as substitute for original.
        end_date: Parsed end date from date_line. Used ONLY for timeline
                  ordering, never shown to user as substitute for original.
    
    DO NOT add title, company, or description fields - those would require
    parsing which destroys the original text structure.
    """
    raw_block: str
    date_line: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


def _parse_date_from_line(line: str) -> tuple[Optional[datetime], Optional[datetime]]:
    """Extract start and end dates from a line containing a date range.
    
    Returns (start_date, end_date) or (None, None) if parsing fails.
    Handles "Present", "Current", "Ongoing" as end dates.
    Handles 2-digit years like "Jul 25" as 2025, not day 25.
    
    This is ONLY for timeline sorting - never display these parsed dates
    instead of the original text.
    """
    line_lower = line.lower().strip()
    
    # Handle "Present" / "Current" / "Ongoing" as end date
    present_keywords = ['present', 'current', 'ongoing', 'till date', 'to date']
    has_present = any(keyword in line_lower for keyword in present_keywords)
    
    # Extract date strings using the same patterns
    date_match = _DATE_RANGE_RE.search(line) or _DATE_RANGE_BARE_2DIGIT_RE.search(line)
    if not date_match:
        return None, None
    
    date_str = date_match.group(0)
    
    # Split on common separators (including various dash types and 'to')
    parts = re.split(r'\s*[-–—~|]\s*|\s+to\s+|\s+TO\s+', date_str, maxsplit=1)
    
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    # Parse start date
    if parts:
        try:
            start_str = parts[0].strip()
            # Check if this is a 2-digit year format (e.g., "Jul 25" not "July 25th")
            # Pattern: Month name + space + 2-digit number (not 4-digit)
            two_digit_match = re.match(r'^([A-Za-z]{3,9})\s+(\d{2})$', start_str)
            if two_digit_match:
                # It's a 2-digit year format like "Jul 25"
                month_str, year_2digit = two_digit_match.groups()
                year_2digit_int = int(year_2digit)
                # Assume 00-40 are 2000-2040, 41-99 are 1941-1999
                if year_2digit_int <= 40:
                    full_year = 2000 + year_2digit_int
                else:
                    full_year = 1900 + year_2digit_int
                # Parse the month
                month_date = dateutil_parser.parse(month_str, fuzzy=True)
                start_date = datetime(full_year, month_date.month, 1)
            else:
                # Regular date format
                start_date = dateutil_parser.parse(start_str, fuzzy=True, default=datetime(2000, 1, 1))
        except (ValueError, OverflowError, AttributeError):
            pass
    
    # Parse end date
    if len(parts) > 1:
        end_part = parts[1].strip()
        if has_present or any(kw in end_part.lower() for kw in present_keywords):
            end_date = datetime.now()
        else:
            try:
                # Check for 2-digit year in end date too
                two_digit_match = re.match(r'^([A-Za-z]{3,9})\s+(\d{2})$', end_part)
                if two_digit_match:
                    month_str, year_2digit = two_digit_match.groups()
                    year_2digit_int = int(year_2digit)
                    if year_2digit_int <= 40:
                        full_year = 2000 + year_2digit_int
                    else:
                        full_year = 1900 + year_2digit_int
                    month_date = dateutil_parser.parse(month_str, fuzzy=True)
                    end_date = datetime(full_year, month_date.month, 1)
                else:
                    end_date = dateutil_parser.parse(end_part, fuzzy=True, default=datetime(2000, 12, 31))
            except (ValueError, OverflowError, AttributeError):
                pass
    elif has_present:
        # Handle case where entire line is "2020 - Present"
        end_date = datetime.now()
    
    return start_date, end_date


def parse_work_experiences(
    experience_section_raw: str, 
    full_text: str = ""
) -> list[WorkExperienceEntry]:
    """Extract work experience entries preserving EXACT original text.
    
    This function uses ONLY boundary detection - no content rewriting.
    Date lines mark entry boundaries. We look BACKWARD from each date line
    to capture title/company, and FORWARD to capture bullets/details.
    
    Strategy:
    - Find all date lines (boundaries)
    - For first entry: start of section → first date line → next date line
    - For middle entries: previous date line → current date line → next date line  
    - For last entry: previous date line → last date line → end of section
    
    This captures title/company BEFORE the date, and content AFTER.
    
    Args:
        experience_section_raw: The raw experience section text BEFORE any
                                formatting/normalization - straight from
                                text_extractor.py
        full_text: The complete resume text (unused, kept for compatibility)
    
    Returns:
        List of WorkExperienceEntry objects, each with raw_block preserved
        exactly as written in the CV.
    
    Rules:
    1. Split ONLY on date-range boundaries
    2. Preserve ALL original formatting: bullets, spacing, line breaks
    3. DO NOT parse title/company into separate fields
    4. DO NOT use spaCy or LLMs
    5. If ambiguous (no clear date), keep as one entry
    """
    if not experience_section_raw.strip():
        return []
    
    lines = experience_section_raw.split('\n')
    entries: list[WorkExperienceEntry] = []
    
    # Find all lines that contain date ranges (these mark entry boundaries)
    date_line_indices: list[tuple[int, str]] = []
    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue
        
        # Check if this line contains a date range pattern
        if _DATE_RANGE_RE.search(stripped) or _DATE_RANGE_BARE_2DIGIT_RE.search(stripped):
            date_line_indices.append((i, stripped))
    
    # If no date lines found, treat entire section as one entry
    if not date_line_indices:
        raw_block = experience_section_raw.strip()
        if len(raw_block) > 10:  # Minimum content threshold
            return [WorkExperienceEntry(
                raw_block=raw_block,
                date_line=None,
                start_date=None,
                end_date=None,
            )]
        return []
    
    # Split into entries based on date line boundaries
    # Strategy: Each entry goes from after the PREVIOUS entry's date line
    # up to THIS entry's date line, capturing title/company BEFORE the date
    for idx, (date_line_num, date_line_text) in enumerate(date_line_indices):
        # Determine start line for this entry's content (before its date line)
        # This captures the title/company that typically appears before dates
        if idx == 0:
            # First entry: start from beginning of section
            content_start = 0
        else:
            # Subsequent entries: start right after the previous entry's date line
            content_start = date_line_indices[idx - 1][0] + 1
        
        # Determine end line (after this entry's date line, up to next boundary)
        if idx + 1 < len(date_line_indices):
            # End just before the next date line (don't include next entry's title)
            content_end = date_line_indices[idx + 1][0]
        else:
            # Last entry: go to end of section
            content_end = len(lines)
        
        # Extract the raw block: from content_start through content_end
        # This includes: title/company (before date) + date line + bullets/details (after date)
        raw_block_lines = lines[content_start:content_end]
        raw_block = '\n'.join(raw_block_lines).strip()
        
        # Skip if too short (likely noise)
        if len(raw_block) < 10:
            continue
        
        # Parse dates for sorting ONLY (never display these instead of original)
        start_date, end_date = _parse_date_from_line(date_line_text)
        
        entries.append(WorkExperienceEntry(
            raw_block=raw_block,
            date_line=date_line_text,
            start_date=start_date,
            end_date=end_date,
        ))
    
    # Sort by start_date (most recent first), with None dates at the end
    entries.sort(
        key=lambda e: (
            e.start_date is None,  # False (has date) sorts before True (no date)
            -(e.start_date.timestamp() if e.start_date else 0)  # Most recent first
        )
    )
    
    return entries
