"""File format and size validation for resume uploads."""
from __future__ import annotations

MAX_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".ods", ".txt"}
ALLOWED_DISPLAY = "PDF, DOCX, DOC, ODS, TXT"


def validate(filename: str, size: int) -> None:
    """Raise ValueError with a user-facing message for invalid files."""
    dot = filename.rfind(".")
    ext = filename[dot:].lower() if dot != -1 else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Not a valid {ALLOWED_DISPLAY} file. "
            f"Received: '{ext or 'unknown'}'. Please upload a supported resume format."
        )
    if size > MAX_BYTES:
        raise ValueError(
            f"File size exceeds the 10 MB limit "
            f"({size / (1024 * 1024):.1f} MB). Please compress or trim the file."
        )
