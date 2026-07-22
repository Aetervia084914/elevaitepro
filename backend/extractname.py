"""
extract_name.py
Extract a candidate's full name from a CV/resume file (PDF or DOCX).

Approach (in priority order):
  1. DOCX: check core document properties (Author/Title) - fast win if the
     file was saved with metadata.
  2. Layout heuristic: look at the text on the first page/first few paragraphs
     and score each line by font size, position (near top), boldness, and
     "name-shape" (title-cased words, no digits/emails/@ symbols, not a
     known section heading like SUMMARY / CONTACT / EXPERIENCE).
     - PDFs: PyMuPDF (fitz) gives per-span font size/flags -> most reliable
       signal, because on 90% of CVs the name is simply the largest text
       on the page.
  3. Regex/NER fallback: scan the top of the document for a 2-4 word
     Title-Case sequence, un-spacing letter-spaced headers like
     "N S I K A K  E T U K" -> "NSIKAK ETUK" -> "Nsikak Etuk".

Libraries used: PyMuPDF (fitz) for PDFs, python-docx for Word files.
Both are pure-Python installable via pip and give access to font/style
metadata that plain-text extractors (pdfminer, textract, docx2txt) throw away
-- and that metadata is precisely the signal that makes name-detection
reliable across wildly different CV templates.
"""

import re
import sys
from pathlib import Path

import fitz  # PyMuPDF
import docx  # python-docx

SECTION_WORDS = {
    "summary", "profile", "contact", "experience", "education", "skills",
    "skill", "core", "professional", "objective", "references", "projects",
    "certifications", "certification", "technologies", "approach", "work",
    "employment", "history", "profile", "about", "personal", "details",
    "curriculum", "vitae", "resume", "cv"
}

ROLE_HINTS = {
    "engineer", "developer", "scientist", "manager", "consultant",
    "analyst", "specialist", "lead", "architect", "director", "officer",
    "supervisor", "executive", "designer", "administrator"
}

NAME_RE = re.compile(r"^[A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){1,3}$")
EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_RE = re.compile(r"[\d+][\d\s().-]{6,}")


def declutter_line_from_words(words, size):
    """Rebuild a line's display text from word tokens, handling letter-spaced headers."""
    words = sorted(words, key=lambda w: w[0])
    texts = [w[4] for w in words]
    single_char_ratio = sum(1 for t in texts if len(t) == 1) / max(len(texts), 1)

    if single_char_ratio < 0.7 or len(words) < 4:
        return " ".join(texts)

    gaps = [words[i][0] - words[i - 1][2] for i in range(1, len(words))]
    gaps_sorted = sorted(gaps)
    median_gap = gaps_sorted[len(gaps_sorted) // 2] if gaps_sorted else 0
    threshold = max(median_gap * 1.8, size * 0.3)

    out = [texts[0]]
    for i in range(1, len(words)):
        gap = words[i][0] - words[i - 1][2]
        out.append(" " if gap > threshold else "")
        out.append(texts[i])
    return "".join(out)


def unspace_letters(line: str) -> str:
    """Fallback cleanup: collapse any remaining run of single-letter tokens."""
    tokens = line.split()
    if tokens and all(len(t) == 1 for t in tokens):
        return "".join(tokens).capitalize()
    return line


def looks_like_name(line: str) -> bool:
    line = line.strip()
    if not line or len(line) > 40:
        return False
    if EMAIL_RE.search(line) or "http" in line.lower() or "linkedin" in line.lower():
        return False
    if PHONE_RE.search(line.replace(" ", "")) and any(c.isdigit() for c in line):
        return False
    low = line.lower()
    if any(w in low for w in SECTION_WORDS):
        return False
    if any(w in low for w in ROLE_HINTS):
        return False
    words = line.split()
    if not (1 < len(words) <= 4):
        return False
    return bool(NAME_RE.match(line)) or all(w.isupper() for w in words)


def extract_name_from_pdf(path: str) -> str | None:
    doc = fitz.open(path)
    page = doc[0]
    all_words = page.get_text("words")
    spans = []
    d = page.get_text("dict")
    for block in d.get("blocks", []):
        for line in block.get("lines", []):
            y0, y1 = line["bbox"][1], line["bbox"][3]
            max_size = max(s["size"] for s in line["spans"])
            is_bold = any("bold" in s["font"].lower() for s in line["spans"])
            line_words = [w for w in all_words if y0 - 1 <= w[1] and w[3] <= y1 + 1]
            if not line_words:
                continue
            text = declutter_line_from_words(line_words, max_size).strip()
            if not text:
                continue
            spans.append((text, max_size, is_bold, y0))
    doc.close()

    if not spans:
        return None

    # Restrict to top third of the page (names live near the top)
    max_y = max(s[3] for s in spans) or 1
    top_spans = [s for s in spans if s[3] <= max_y * 0.4] or spans

    candidates = []
    for text, size, bold, y in top_spans:
        cleaned = unspace_letters(text)
        if looks_like_name(cleaned):
            candidates.append((cleaned, size, bold, y))

    if not candidates:
        return None

    # Prefer the largest font size; tie-break by boldness then topmost position
    candidates.sort(key=lambda c: (-c[1], not c[2], c[3]))
    return " ".join(w.capitalize() if w.isupper() else w for w in candidates[0][0].split())


def extract_name_from_docx(path: str) -> str | None:
    d = docx.Document(path)

    # 1) Try core properties first (author/title metadata)
    core = d.core_properties
    for candidate in (core.author, core.title):
        if candidate and looks_like_name(candidate.strip()):
            return candidate.strip()

    # 2) Layout heuristic over the first ~15 paragraphs
    candidates = []
    for i, para in enumerate(d.paragraphs[:15]):
        text = para.text.strip()
        if not text:
            continue
        cleaned = unspace_letters(text)
        if not looks_like_name(cleaned):
            continue
        max_size = 0
        is_bold = False
        for run in para.runs:
            if run.font.size:
                max_size = max(max_size, run.font.size.pt)
            if run.bold:
                is_bold = True
        candidates.append((cleaned, max_size, is_bold, i))

    if not candidates:
        return None

    candidates.sort(key=lambda c: (-c[1], not c[2], c[3]))
    return " ".join(w.capitalize() if w.isupper() else w for w in candidates[0][0].split())


def extract_name(path: str) -> str | None:
    ext = Path(path).suffix.lower()
    if ext == ".pdf":
        return extract_name_from_pdf(path)
    elif ext == ".docx":
        return extract_name_from_docx(path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


if __name__ == "__main__":
    files = sys.argv[1:]
    for f in files:
        try:
            name = extract_name(f)
        except Exception as e:
            name = f"ERROR: {e}"
        print(f"{Path(f).name:35s} -> {name}")