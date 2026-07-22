"""
POST /generatesummarypdf

Generates the Summary PDF with Playwright Chromium. The HTML is built from the
same summary template used by /get-summary-pdf so the downloaded PDF mirrors the
Next.js Summary modal content.
"""
from __future__ import annotations

import logging
import re

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response

from app.api.get_summary_pdf import SummaryPdfRequest, build_html
from app.api.pdf_renderer import render_html_to_pdf_async

router = APIRouter(tags=["summary-pdf"])
logger = logging.getLogger(__name__)


async def _html_to_pdf_with_chromium(html_doc: str) -> bytes:
    return await render_html_to_pdf_async(
        html_doc,
        media="print",
        viewport_width=1240,
        viewport_height=1754,
        format="A4",
        margin={
            "top": "10mm",
            "right": "12mm",
            "bottom": "10mm",
            "left": "12mm",
        },
    )


@router.post("/generatesummarypdf")
async def generatesummarypdf(req: SummaryPdfRequest) -> Response:
    """Generate and return the ATS Summary as a downloadable Chromium PDF."""
    try:
        html_doc = build_html(req)
        pdf_bytes = await _html_to_pdf_with_chromium(html_doc)
    except Exception as exc:
        logger.exception("[GenerateSummaryPDF] generation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"{type(exc).__name__}: {exc}",
        ) from exc

    safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", req.career_goal or "Summary").strip("_") or "Summary"
    filename = f"{safe_name}_Summary.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
        },
    )
