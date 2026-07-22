"""Regex-based text cleaner for resume / CV raw text.

Replaces the former spaCy-based cleaner. Produces a structured cleaned
output suitable for downstream certification matching.
"""
from __future__ import annotations

import logging
import re
import time
from dataclasses import asdict, dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

_CERT_INDICATOR_WORDS: frozenset[str] = frozenset({
    "certify", "certificate", "certification", "certified", "credential",
    "accreditation", "accredited", "license", "licence", "licensed",
    "diploma", "qualify", "qualified", "earn", "earned", "obtain",
    "obtained", "award", "awarded", "complete", "completed", "hold",
    "holds", "pass", "passed",
})

_SENTENCE_SPLIT_RE = re.compile(r'(?<=[.!?])\s+|\n+')
_WHITESPACE_RE = re.compile(r'\s+')
_ORG_PATTERN = re.compile(
    r'\b(?:[A-Z][A-Za-z&]*(?:\s+[A-Z][A-Za-z&]*){1,5})'
    r'(?:\s+(?:Inc|LLC|Ltd|Corp|Corporation|Group|Foundation|Institute|'
    r'Association|University|College|Academy|Council|Board|Authority))\b'
)


@dataclass
class SpacyCleanedText:
    cleaned_text: str = ""
    sentences: list[str] = field(default_factory=list)
    entities: list[dict[str, Any]] = field(default_factory=list)
    org_names: list[str] = field(default_factory=list)
    cert_context_sentence_indices: list[int] = field(default_factory=list)
    skill_duty_spans: list[dict[str, Any]] = field(default_factory=list)
    token_summary: list[dict[str, str]] = field(default_factory=list)
    noun_chunks: list[str] = field(default_factory=list)
    processing_ms: float = 0.0
    token_count: int = 0
    sentence_count: int = 0
    entity_count: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def clean_text_with_spacy(raw_text: str) -> SpacyCleanedText:
    """Clean resume text using regex-based processing.

    Despite the function name (kept for backward compatibility), this no
    longer uses spaCy. It performs:
    1. Sentence segmentation via regex.
    2. Organisation name extraction via pattern matching.
    3. Certification-context sentence detection via keyword matching.
    4. Whitespace-normalised cleaned text.
    """
    t0 = time.perf_counter()

    text = raw_text[:1_000_000] if len(raw_text) > 1_000_000 else raw_text
    result = SpacyCleanedText()

    # Sentence segmentation
    raw_sentences = _SENTENCE_SPLIT_RE.split(text)
    sentences: list[str] = []
    cert_indices: list[int] = []

    for idx, sent in enumerate(raw_sentences):
        sent_text = _WHITESPACE_RE.sub(' ', sent).strip()
        if not sent_text or len(sent_text) < 3:
            continue
        sentences.append(sent_text)
        words_lower = set(sent_text.lower().split())
        if words_lower & _CERT_INDICATOR_WORDS:
            cert_indices.append(len(sentences) - 1)

    result.sentences = sentences
    result.sentence_count = len(sentences)
    result.cert_context_sentence_indices = cert_indices

    # Organisation names via pattern matching
    org_names: list[str] = []
    seen_orgs: set[str] = set()
    for m in _ORG_PATTERN.finditer(text):
        name = m.group(0).strip()
        if name.lower() not in seen_orgs:
            seen_orgs.add(name.lower())
            org_names.append(name)
            result.entities.append({
                "text": name,
                "label": "ORG",
                "start_char": m.start(),
                "end_char": m.end(),
            })
    result.org_names = org_names
    result.entity_count = len(result.entities)

    # Token count (simple word-level)
    words = [w for w in text.split() if w.strip()]
    result.token_count = len(words)

    # Cleaned text
    result.cleaned_text = "\n".join(sentences)

    result.processing_ms = round((time.perf_counter() - t0) * 1000, 2)
    logger.info(
        "Text cleaning complete: %d tokens, %d sentences, %d entities, "
        "%d cert-context sents, %.1fms",
        result.token_count, result.sentence_count, result.entity_count,
        len(cert_indices), result.processing_ms,
    )

    return result
