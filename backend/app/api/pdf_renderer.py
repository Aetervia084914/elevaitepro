from __future__ import annotations

import asyncio
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from functools import partial

try:
    from playwright.sync_api import sync_playwright as _sync_playwright
except Exception:  # pragma: no cover - optional dependency during import
    _sync_playwright = None

_pdf_pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix="pdf_renderer")
_policy_lock = threading.Lock()


def sync_playwright():
    if _sync_playwright is None:
        raise RuntimeError("playwright is not installed")
    return _sync_playwright()


def render_html_to_pdf(
    html_content: str,
    *,
    media: str = "print",
    viewport_width: int = 1240,
    viewport_height: int = 1754,
    format: str = "A4",
    margin: dict[str, str] | None = None,
    print_background: bool = True,
    prefer_css_page_size: bool = True,
) -> bytes:
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
                    viewport={"width": viewport_width, "height": viewport_height},
                    device_scale_factor=1,
                )
                page.emulate_media(media=media)
                page.set_content(html_content, wait_until="networkidle")
                return page.pdf(
                    format=format,
                    print_background=print_background,
                    prefer_css_page_size=prefer_css_page_size,
                    margin=margin or {
                        "top": "10mm",
                        "right": "12mm",
                        "bottom": "10mm",
                        "left": "12mm",
                    },
                )
            finally:
                browser.close()
    finally:
        if needs_proactor:
            asyncio.set_event_loop_policy(old_policy)
            _policy_lock.release()


async def render_html_to_pdf_async(
    html_content: str,
    *,
    media: str = "print",
    viewport_width: int = 1240,
    viewport_height: int = 1754,
    format: str = "A4",
    margin: dict[str, str] | None = None,
    print_background: bool = True,
    prefer_css_page_size: bool = True,
) -> bytes:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        _pdf_pool,
        partial(
            render_html_to_pdf,
            html_content,
            media=media,
            viewport_width=viewport_width,
            viewport_height=viewport_height,
            format=format,
            margin=margin,
            print_background=print_background,
            prefer_css_page_size=prefer_css_page_size,
        ),
    )
