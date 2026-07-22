from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api import pdf_renderer


class FakePage:
    def __init__(self) -> None:
        self.content = None
        self.pdf_kwargs = None
        self.media = None

    def emulate_media(self, media: str) -> None:
        self.media = media

    def set_content(self, html: str, wait_until: str) -> None:
        self.content = (html, wait_until)

    def pdf(self, **kwargs):
        self.pdf_kwargs = kwargs
        return b"pdf-bytes"


class FakeBrowser:
    def __init__(self) -> None:
        self.page = FakePage()

    def new_page(self, **kwargs):
        self.page.viewport = kwargs
        return self.page

    def close(self) -> None:
        return None


class FakeChromium:
    def __init__(self, browser: FakeBrowser) -> None:
        self._browser = browser

    def launch(self, **kwargs):
        self.launch_kwargs = kwargs
        return self._browser


class FakePlaywright:
    def __init__(self) -> None:
        self.browser = FakeBrowser()
        self.chromium = FakeChromium(self.browser)


class FakeContextManager:
    def __init__(self, playwright) -> None:
        self.playwright = playwright

    def __enter__(self):
        return self.playwright

    def __exit__(self, exc_type, exc, tb):
        return False


def test_render_html_to_pdf_uses_playwright(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_playwright = FakePlaywright()

    def fake_sync_playwright():
        return FakeContextManager(fake_playwright)

    monkeypatch.setattr(pdf_renderer, "sync_playwright", fake_sync_playwright)

    result = pdf_renderer.render_html_to_pdf("<html>hello</html>", media="print")

    assert result == b"pdf-bytes"
    assert fake_playwright.browser.page.content[0] == "<html>hello</html>"
    assert fake_playwright.browser.page.content[1] == "networkidle"
    assert fake_playwright.browser.page.media == "print"


def test_render_html_to_pdf_async_passes_kwargs(monkeypatch: pytest.MonkeyPatch) -> None:
    seen = {}

    def fake_render(html_content: str, **kwargs):
        seen["html"] = html_content
        seen["kwargs"] = kwargs
        return b"async-bytes"

    monkeypatch.setattr(pdf_renderer, "render_html_to_pdf", fake_render)

    result = asyncio.run(pdf_renderer.render_html_to_pdf_async("<html>async</html>", media="screen"))

    assert result == b"async-bytes"
    assert seen["html"] == "<html>async</html>"
    assert seen["kwargs"]["media"] == "screen"
