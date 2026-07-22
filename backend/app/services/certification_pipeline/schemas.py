"""Pydantic models and dataclasses for the alias matcher pipeline."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Stage1Output:
    """Output of Stage 1 — File Upload, Format Detection & Text Extraction."""
    raw_text: str
    file_format: str
    file_size_bytes: int
    request_id: str
    content_hash: str
    stageoutput: dict[str, Any] = field(default_factory=dict)


@dataclass
class Stage2Output:
    """Output of Stage 2 — Raw Text Normalization & Alias-Safe Cleaning."""
    cleaned_text: str
    stageoutput: dict[str, Any] = field(default_factory=dict)


@dataclass
class Stage3Output:
    """Output of Stage 3 — DB Alias Fetch & Aho-Corasick Automaton Build."""
    automaton: Any  # ahocorasick.Automaton — primary (lowercase)
    automaton_norm: Any  # ahocorasick.Automaton — normalized forms (Tier 2)
    alias_index: dict[str, str] = field(default_factory=dict)
    norm_index: dict[str, str] = field(default_factory=dict)
    alias_cert_map: dict[str, str] = field(default_factory=dict)  # alias_lower → cert_id
    cert_name_automaton: Any = None  # ahocorasick.Automaton — certification names (full text)
    cert_name_index: dict[str, str] = field(default_factory=dict)  # name_lower → original name
    cert_name_cert_map: dict[str, str] = field(default_factory=dict)  # name_lower → cert_id
    alias_token_whitelist: set[str] = field(default_factory=set)
    stageoutput: dict[str, Any] = field(default_factory=dict)


@dataclass
class MatchDetail:
    """Per-alias match detail."""
    alias: str
    alias_original: str
    count: int
    match_tier: str       # "exact", "normalized", "fuzzy"
    confidence: float
    positions: list[dict[str, int]] = field(default_factory=list)


@dataclass
class Stage4Output:
    """Output of Stage 4 — Alias Detection (Tier 1 + 2 + 3)."""
    matches: dict[str, MatchDetail] = field(default_factory=dict)
    found: list[str] = field(default_factory=list)
    total_found: int = 0
    stageoutput: dict[str, Any] = field(default_factory=dict)
