"""
POST /generateresumepdf

Renders the resume preview HTML with Playwright Chromium and returns a PDF.
The frontend sends the already-rendered Next.js preview DOM plus the page CSS,
so the PDF follows the visual preview instead of a separate backend template.
"""
from __future__ import annotations

import asyncio
import logging
import re
import sys
import threading
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel

router = APIRouter(tags=["resume-pdf"])
logger = logging.getLogger(__name__)
_pdf_pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix="resume_pdf_chromium")
_policy_lock = threading.Lock()


class ResumePdfRequest(BaseModel):
    html: str
    styles: str = ""
    filename: str = "Resume"


def _safe_filename(value: str | None) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_\-]", "_", value or "Resume").strip("_")
    return cleaned or "Resume"


def _build_document(req: ResumePdfRequest) -> str:
    return f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * {{
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }}
      html, body {{
        margin: 0;
        padding: 0;
        background: #ffffff;
      }}
      body {{
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }}
      .resume-pdf-page {{
        width: 780px;
        max-width: 780px;
        background: #ffffff;
      }}
      .resume-pdf-page > * {{
        margin: 0 !important;
        max-width: none !important;
        width: 100% !important;
      }}
      @page {{
        size: A4;
        margin: 0;
      }}
      @media print {{
        body {{
          display: block;
        }}
        .resume-pdf-page {{
          width: 100%;
          max-width: none;
        }}
      }}
      {req.styles}
    </style>
  </head>
  <body>
    <main class="resume-pdf-page">{req.html}</main>
  </body>
</html>"""


def _html_to_pdf_with_chromium_sync(html_doc: str) -> bytes:
    from playwright.sync_api import sync_playwright

    old_policy = None
    needs_proactor = sys.platform == "win32" and hasattr(asyncio, "WindowsProactorEventLoopPolicy")

    if needs_proactor:
        _policy_lock.acquire()
        old_policy = asyncio.get_event_loop_policy()
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                ],
            )
            try:
                page = browser.new_page(
                    viewport={"width": 780, "height": 1200},
                    device_scale_factor=1,
                )
                page.emulate_media(media="screen")
                page.set_content(html_doc, wait_until="networkidle")
                return page.pdf(
                    format="A4",
                    print_background=True,
                    prefer_css_page_size=True,
                    margin={
                        "top": "0",
                        "right": "0",
                        "bottom": "0",
                        "left": "0",
                    },
                )
            finally:
                browser.close()
    finally:
        if needs_proactor:
            asyncio.set_event_loop_policy(old_policy)
            _policy_lock.release()


async def _html_to_pdf_with_chromium(html_doc: str) -> bytes:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_pdf_pool, _html_to_pdf_with_chromium_sync, html_doc)


@router.post("/generateresumepdf")
async def generateresumepdf(req: ResumePdfRequest) -> Response:
    if not req.html.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume preview HTML is required",
        )

    try:
        pdf_bytes = await _html_to_pdf_with_chromium(_build_document(req))
    except Exception as exc:
        logger.exception("[GenerateResumePDF] generation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"{type(exc).__name__}: {exc}",
        ) from exc

    filename = f"{_safe_filename(req.filename)}_Resume.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
        },
    )
