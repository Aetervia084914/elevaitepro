# Work Experience Extraction Architecture

## Overview

Work experience is now extracted and preserved **EXACTLY as written in the original CV** - no LLM rewriting, no spaCy parsing, no title/company field separation. Only boundary detection using date patterns.

## Core Principle

**The `raw_block` field is the source of truth.** It contains the complete, untouched text for each work experience entry including job title, company, dates, bullets, descriptions - exactly as it appears in the CV.

## Architecture

### Backend Components

#### 1. `workexp_extractor/resume_extractor.py`
- **Function**: `parse_work_experiences(experience_section_raw, full_text="")`
- **Input**: Raw experience section text BEFORE any formatting (from `section_detector.py`)
- **Output**: List of `WorkExperienceEntry` dataclasses

#### 2. `WorkExperienceEntry` Dataclass

```python
@dataclass
class WorkExperienceEntry:
    raw_block: str                    # PRIMARY FIELD - untouched original text
    date_line: Optional[str]          # The date line that triggered boundary detection
    start_date: Optional[datetime]    # Parsed for sorting ONLY
    end_date: Optional[datetime]      # Parsed for sorting ONLY
```

**Important**: DO NOT add `title`, `company`, or `description` fields - those would require parsing which destroys the original text structure.

### Boundary Detection Logic

1. **Find date lines**: Scan for lines containing date range patterns:
   - `Mar 2020 - Jun 2023`
   - `Jan 2020 - Present`
   - `2018 - 2022`
   - `Jul 25 - Present` (bare 2-digit year)
   - `01/2020 - 03/2023`

2. **Split into entries**: Each date line marks a boundary. The entry includes:
   - Everything from the previous boundary (or start of section)
   - Up to the next date boundary
   - This captures job title/company BEFORE the date line

3. **Preserve everything**: Original bullets, spacing, line breaks, indentation - all preserved

4. **Sort by recency**: Entries sorted by `start_date` (most recent first), using parsed dates only for ordering

### Integration Points

#### `resume_upload.py`
```python
# Line 485 - Already correctly passes raw text
structured_work_exp = _build_structured_work_experience(
    work_text_raw,    # ← UNFORMATTED text from section_detector
    work_text,        # ← Formatted text (for backward compatibility)
    raw_text          # ← Full resume text
)
```

#### Response Structure
```json
{
  "formatted_text": "...",  // Kept for backward compatibility
  "entries": [
    {
      "raw_block": "Senior Engineer\nTech Corp\nJan 2020 - Present\n• Led team...",
      "date_line": "Jan 2020 - Present",
      "start_date": "2020-01-01T00:00:00",
      "end_date": "2026-07-17T22:00:00"
    }
  ]
}
```

## Frontend Implementation Requirements

### Rendering Work Experience

**CRITICAL**: Render `entry.raw_block` verbatim. Do NOT render `formatted_text` for CV preview/export.

```typescript
// CORRECT - Preserve line breaks
<div style={{ whiteSpace: 'pre-wrap' }}>
  {entry.raw_block}
</div>

// Or with Tailwind
<div className="whitespace-pre-wrap">
  {entry.raw_block}
</div>
```

**DO NOT**:
- Run `raw_block` through any string transforms
- Try to parse title/company/dates from `raw_block`
- Apply additional formatting or styling that changes structure
- Use the `formatted_text` field for CV preview (it's for legacy code only)

### Example React Component

```tsx
interface WorkExperienceEntry {
  raw_block: string;
  date_line: string | null;
  start_date: string | null;
  end_date: string | null;
}

function WorkExperienceSection({ entries }: { entries: WorkExperienceEntry[] }) {
  return (
    <div className="space-y-6">
      {entries.map((entry, index) => (
        <div key={index} className="whitespace-pre-wrap">
          {entry.raw_block}
        </div>
      ))}
    </div>
  );
}
```

## Testing

Run backend tests:
```bash
cd backend
pytest tests/test_work_experience_extractor.py -v
```

All 10 tests pass:
- ✅ Simple date range splitting
- ✅ Original bullet preservation
- ✅ Spacing and line break preservation
- ✅ Bare 2-digit year support (`Jul 25 - Present`)
- ✅ Ambiguous text handling
- ✅ Date-based sorting
- ✅ Empty section handling
- ✅ Date parsing for sorting
- ✅ Present/Current/Ongoing keyword recognition
- ✅ Real-world CV format handling

## Supported Date Formats

The extractor recognizes these date patterns as entry boundaries:

1. **Full ranges**: `Mar 2020 - Jun 2023`, `January 2020 - Present`
2. **Year ranges**: `2018 - 2022`, `2020 - Present`
3. **Numeric ranges**: `01/2020 - 03/2023`
4. **Bare 2-digit years**: `Jul 25 - Present`, `Jan 23 - Jun 25`
5. **Single dates**: `May 2023` (weaker signal)
6. **Bare years**: `2020` (weakest signal)

## Backward Compatibility

The `formatted_text` field is still populated by `format_work_experience()` for any code that currently depends on it. Check usages before removing.

Current code flow:
```python
work_text_raw = sections.get("experience", "")  # Raw from section_detector
work_text = format_work_experience(work_text_raw)  # Formatted (legacy)

structured_work_exp = _build_structured_work_experience(
    work_text_raw,  # New: Pass raw text to extractor
    work_text,      # Old: Keep formatted for compatibility
    raw_text
)
```

## No New Dependencies

This implementation uses:
- ✅ `python-dateutil` (already in requirements.txt)
- ✅ Standard library `re`, `dataclasses`, `datetime`
- ❌ No spaCy (removed)
- ❌ No torch (removed)
- ❌ No LLM calls (removed)

## Migration Guide for Frontend

1. **Locate CV preview/export rendering** - Find where work experience is currently displayed
2. **Replace with `raw_block`** - Change from rendering structured fields to `raw_block`
3. **Add `whitespace-pre-wrap`** - Ensure line breaks are preserved in CSS
4. **Remove formatting logic** - Delete any code that parses or restructures experience text
5. **Test with real CVs** - Verify formatting matches the uploaded CV exactly

## Examples

### Input (Raw CV Text)
```
SENIOR SOFTWARE ENGINEER
TechStartup Inc., San Francisco, CA
January 2021 - Present

• Architected microservices infrastructure
• Led team of 8 engineers
• Reduced deployment time by 75%
```

### Output (`raw_block`)
```
SENIOR SOFTWARE ENGINEER
TechStartup Inc., San Francisco, CA
January 2021 - Present

• Architected microservices infrastructure
• Led team of 8 engineers
• Reduced deployment time by 75%
```

**Note**: Identical. No rewriting, no reformatting, no field separation.

## Troubleshooting

### Problem: Experience entries not detected
**Solution**: Check if dates match supported patterns. Add debug logging in `parse_work_experiences()`.

### Problem: Title/company missing from entries
**Solution**: Verify date line appears AFTER title/company in the CV. The boundary detection includes text before the date.

### Problem: Line breaks not preserved in frontend
**Solution**: Ensure CSS has `white-space: pre-wrap` or equivalent.

### Problem: Multiple jobs merged into one entry
**Solution**: Check that each job has a distinct date line. If dates are missing, the extractor keeps it as one block (by design - better to under-split than wrongly split).

## Performance

- **No LLM calls** - No network latency, no token costs
- **No spaCy models** - No model loading time
- **Simple regex** - Fast pattern matching (~10ms for typical CV)
- **Memory efficient** - Dataclasses, no large models in memory

## Security

- **No external calls** - All processing is local
- **No code injection** - Simple string operations, no eval()
- **Input validation** - Date parsing uses dateutil with error handling
