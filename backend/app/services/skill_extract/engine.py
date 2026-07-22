"""
Skill extraction engine — two-stage approach:

  1. **FlashText exact match** against taxonomy_skills + taxonomy_aliases
     O(n) keyword extraction using Aho-Corasick automaton.
  2. **RapidFuzz fuzzy match** on leftover n-grams (token_sort_ratio ≥ 82).

All taxonomy data is loaded once at startup and cached in memory.
"""
from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass, field

from flashtext import KeywordProcessor
from rapidfuzz import fuzz, process as rfprocess

logger = logging.getLogger(__name__)

# ── Tunables ─────────────────────────────────────────────────────────────────
MIN_FUZZY_SCORE = 92          # rapidfuzz token_sort_ratio threshold
MIN_FUZZY_GRAM_CHARS = 5      # skip short n-grams for fuzzy pass
MAX_FUZZY_CANDIDATES = 200    # cap n-grams sent to fuzzy pass


# ── Data structures ──────────────────────────────────────────────────────────
@dataclass
class TaxonomySkill:
    skill_id: int
    canonical_name: str
    skill_type: str | None = None
    description: str | None = None


@dataclass
class MatchedSkill:
    skill_id: int
    canonical_name: str
    skill_type: str | None = None
    match_source: str = "exact"      # exact | fuzzy | llm | llm_discovered
    confidence: float = 1.0
    span: str = ""                   # original text span
    in_taxonomy: bool = True          # False for LLM-discovered skills not in DB


@dataclass
class ExtractionResult:
    skills: list[MatchedSkill] = field(default_factory=list)
    raw_text_length: int = 0
    stages_used: list[str] = field(default_factory=list)
    elapsed_ms: float = 0.0


# ── Keyword index ────────────────────────────────────────────────────────────
class SkillIndex:
    """In-memory FlashText + lookup dict built from taxonomy tables."""

    def __init__(self) -> None:
        self._kw = KeywordProcessor(case_sensitive=False)
        self._by_name: dict[str, TaxonomySkill] = {}     # lower(canonical) → skill
        self._by_alias: dict[str, TaxonomySkill] = {}     # lower(alias)     → skill
        self._all_names: list[str] = []                   # for fuzzy search
        self._ready = False

    @property
    def ready(self) -> bool:
        return self._ready

    # ── Build from DB ────────────────────────────────────────────────────
    async def load(self, conn) -> None:
        """Populate index from taxonomy_skills + taxonomy_aliases."""
        t0 = time.monotonic()

        # 1. Load canonical names
        sid_map: dict[int, TaxonomySkill] = {}
        cur = await conn.execute(
            "SELECT skill_id, canonical_name, skill_type, description "
            "FROM taxonomy_skills"
        )
        rows = await cur.fetchall()
        for skill_id, name, stype, desc in rows:
            sk = TaxonomySkill(skill_id=skill_id, canonical_name=name,
                               skill_type=stype, description=desc)
            key = name.lower()
            sid_map[skill_id] = sk
            self._by_name[key] = sk
            self._kw.add_keyword(key, name)
            self._all_names.append(key)

        # 2. Load aliases → point to same TaxonomySkill via sid_map O(1)
        cur = await conn.execute(
            "SELECT a.alias_lower, a.skill_id "
            "FROM taxonomy_aliases a"
        )
        alias_rows = await cur.fetchall()
        for alias, sid in alias_rows:
            parent = sid_map.get(sid)
            if parent and alias not in self._by_name:
                self._by_alias[alias] = parent
                self._kw.add_keyword(alias, parent.canonical_name)

        self._ready = True
        elapsed = (time.monotonic() - t0) * 1000
        logger.info(
            "SkillIndex loaded — %d skills, %d aliases (%.0f ms)",
            len(self._by_name), len(self._by_alias), elapsed,
        )

    # ── Lookup helpers ───────────────────────────────────────────────────
    def resolve(self, name: str) -> TaxonomySkill | None:
        key = name.lower()
        return self._by_name.get(key) or self._by_alias.get(key)

    def extract_keywords(self, text: str) -> list[tuple[str, int, int]]:
        """Return list of (canonical_name, start, end) found in text."""
        return self._kw.extract_keywords(text, span_info=True)


# ── Extraction stages ────────────────────────────────────────────────────────

_CLEAN_RE = re.compile(r"[^\w\s\-/#+.]", re.UNICODE)
_WS_RE = re.compile(r"\s+")


def _clean(text: str) -> str:
    """Light normalisation: drop noisy symbols, collapse whitespace."""
    return _WS_RE.sub(" ", _CLEAN_RE.sub(" ", text)).strip()


def _ngrams(tokens: list[str], min_n: int = 1, max_n: int = 4) -> list[str]:
    """Generate n-grams from token list."""
    grams: list[str] = []
    for n in range(min_n, max_n + 1):
        for i in range(len(tokens) - n + 1):
            grams.append(" ".join(tokens[i : i + n]))
    return grams


def stage_exact(text: str, index: SkillIndex) -> list[MatchedSkill]:
    """Stage 1 — FlashText exact keyword extraction + word-boundary pass.

    FlashText handles multi-word and long terms efficiently.
    The word-boundary pass catches short tech terms (Python, SQL, AWS, R)
    that FlashText may miss due to PDF formatting or tokenization.
    """
    seen: dict[int, MatchedSkill] = {}

    # 1a. FlashText bulk extraction
    hits = index.extract_keywords(text)
    for canonical, start, end in hits:
        sk = index.resolve(canonical)
        if sk and sk.skill_id not in seen:
            seen[sk.skill_id] = MatchedSkill(
                skill_id=sk.skill_id,
                canonical_name=sk.canonical_name,
                skill_type=sk.skill_type,
                match_source="exact",
                confidence=1.0,
                span=text[start:end],
            )

    # 1b. Word-boundary regex pass for single-word skills (Python, SQL, AWS, R, etc.)
    # Extract individual words from text, look up each against the index
    words = set(re.findall(r"\b[A-Za-z#\+\.]{1,30}\b", text))
    for word in words:
        sk = index.resolve(word)
        if sk and sk.skill_id not in seen:
            seen[sk.skill_id] = MatchedSkill(
                skill_id=sk.skill_id,
                canonical_name=sk.canonical_name,
                skill_type=sk.skill_type,
                match_source="exact",
                confidence=1.0,
                span=word,
            )

    return list(seen.values())


def _is_valid_fuzzy(gram: str, skill_name: str) -> bool:
    """Reject fuzzy matches where the n-gram has no lexical overlap with the skill."""
    g_tokens = set(gram.lower().split())
    s_tokens = set(skill_name.lower().split())
    # At least one real word must overlap (not stopwords)
    _STOP = {"a", "an", "the", "and", "or", "of", "in", "to", "for", "with", "on", "is", "by", "at", "i"}
    g_real = g_tokens - _STOP
    s_real = s_tokens - _STOP
    return bool(g_real & s_real)


def stage_fuzzy(
    text: str,
    index: SkillIndex,
    already_found: set[int],
) -> list[MatchedSkill]:
    """Stage 2 — rapidfuzz fuzzy match on leftover n-grams."""
    cleaned = _clean(text)
    tokens = cleaned.lower().split()
    grams = _ngrams(tokens, min_n=2, max_n=4)

    # Filter short grams and deduplicate
    unique_grams = list(dict.fromkeys(
        g for g in grams if len(g) >= MIN_FUZZY_GRAM_CHARS
    ))[:MAX_FUZZY_CANDIDATES]
    if not unique_grams or not index._all_names:
        return []

    results: list[MatchedSkill] = []
    seen: set[int] = set(already_found)

    for gram in unique_grams:
        matches = rfprocess.extract(
            gram, index._all_names,
            scorer=fuzz.token_sort_ratio,
            limit=1,
            score_cutoff=MIN_FUZZY_SCORE,
        )
        for match_name, score, _ in matches:
            # Reject spurious matches with no real word overlap
            if not _is_valid_fuzzy(gram, match_name):
                continue
            sk = index.resolve(match_name)
            if sk and sk.skill_id not in seen:
                seen.add(sk.skill_id)
                results.append(MatchedSkill(
                    skill_id=sk.skill_id,
                    canonical_name=sk.canonical_name,
                    skill_type=sk.skill_type,
                    match_source="fuzzy",
                    confidence=round(score / 100, 2),
                    span=gram,
                ))
    return results


# ── Orchestrator ─────────────────────────────────────────────────────────────

async def extract_skills(
    text: str,
    index: SkillIndex,
    *,
    use_llm: bool = True,
) -> ExtractionResult:
    """Run the full extraction pipeline on raw text."""
    t0 = time.monotonic()
    result = ExtractionResult(raw_text_length=len(text))

    # Stage 1 — exact
    exact_matches = stage_exact(text, index)
    result.skills.extend(exact_matches)
    result.stages_used.append("exact")
    found_ids = {m.skill_id for m in result.skills}

    # Stage 2 — fuzzy
    fuzzy_matches = stage_fuzzy(text, index, found_ids)
    result.skills.extend(fuzzy_matches)
    result.stages_used.append("fuzzy")
    found_ids.update(m.skill_id for m in fuzzy_matches)

    # LLM fallback removed; keep exact + fuzzy output only.
    if use_llm:
        pass

    # Sort by confidence descending
    result.skills.sort(key=lambda m: m.confidence, reverse=True)
    result.elapsed_ms = round((time.monotonic() - t0) * 1000, 1)
    return result
