"""NLP loader stub — spaCy dependency removed.

The certification pipeline now uses regex-based cleaning instead of spaCy.
This module is kept for backward compatibility but returns None.
"""
from __future__ import annotations

import logging
from functools import lru_cache

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_nlp():
    """Return None — spaCy model is no longer loaded."""
    logger.info("spaCy model disabled — using regex-based text cleaning")
    return None
