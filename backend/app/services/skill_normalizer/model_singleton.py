"""Encoder stubs — sentence-transformers dependency removed.

Stage 3C (semantic matching) is disabled. All functions are no-ops.
"""
from __future__ import annotations

import logging

from fastapi import Request

logger = logging.getLogger(__name__)


async def init_encoder(app) -> None:
    app.state.encoder = None
    logger.info("Encoder disabled — sentence-transformers removed")


async def close_encoder(app) -> None:
    app.state.encoder = None


def get_encoder(request: Request):
    raise RuntimeError("Encoder not available — sentence-transformers dependency removed")


def encode_texts(texts: list[str], encoder) -> list[list[float]]:
    raise RuntimeError("Encoder not available — sentence-transformers dependency removed")
