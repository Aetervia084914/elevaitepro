from __future__ import annotations

from docx import Document

from app.services.resume_parser.contact_extractor import extract_contact_info


def test_extract_contact_info_uses_uploaded_cv_name(tmp_path) -> None:
    resume_path = tmp_path / "resume.docx"
    doc = Document()
    doc.core_properties.author = "Jane Doe"
    doc.save(resume_path)

    result = extract_contact_info(
        "Contact\nJane@example.com\n07700000000\n",
        file_name=str(resume_path),
        file_bytes=resume_path.read_bytes(),
    )

    assert result["name"] == "Jane Doe"
    assert result["email"] == "Jane@example.com"
    assert result["phone"] == "07700000000"
