"""
Stage 3 - DB Alias Fetch & Aho-Corasick Automaton Build

Stage 3A: Async DB fetch of all aliases at startup.
  - Query configurable via ALIAS_TABLE / ALIAS_COLUMN env vars.
  - Strip whitespace, deduplicate (case-insensitive), filter blanks.
  - Apply same NFC + ftfy normalization pass as Stage 2 to alias strings.

Stage 3B: Build compiled Aho-Corasick finite automaton.
  - Add both original-case and lowercase variants for each alias.
  - A.make_automaton() compiles failure links.
  - Store in app.state.alias_automaton + app.state.alias_index.

Runs once at startup. Rebuilt via POST /reload-aliases admin endpoint.
"""
from __future__ import annotations

import logging
import os
import time
import unicodedata
from typing import Any

import ahocorasick
import ftfy

from app.services.certification_pipeline.schemas import Stage3Output

logger = logging.getLogger(__name__)

# Configurable via env vars (architecture spec)
ALIAS_TABLE = os.getenv("ALIAS_TABLE", "cert_aliases")
ALIAS_COLUMN = os.getenv("ALIAS_COLUMN", "alias")


# -- Stage 3A: Fetch aliases from DB --

async def _fetch_aliases_from_db(pool) -> list[tuple[str, str]]:
    """
    Fetch all non-empty alias values and their cert_id from the configured table.
    Returns list of (alias, cert_id) tuples.
    """
    query = f"SELECT {ALIAS_COLUMN}, cert_id FROM public.{ALIAS_TABLE} WHERE {ALIAS_COLUMN} IS NOT NULL AND {ALIAS_COLUMN} != ''"

    raw_aliases: list[tuple[str, str]] = []
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(query)
            rows = await cur.fetchall()
            raw_aliases = [(row[0], row[1]) for row in rows]

    logger.info("Stage 3A: fetched %d raw aliases from %s.%s", len(raw_aliases), ALIAS_TABLE, ALIAS_COLUMN)
    return raw_aliases


def _normalize_alias(alias: str) -> str:
    """Apply the same normalization pass as Stage 2 to an alias string."""
    text = alias.strip()
    text = unicodedata.normalize("NFC", text)
    text = ftfy.fix_text(text)
    return text


def _deduplicate_aliases(
    raw_aliases: list[tuple[str, str]],
) -> tuple[list[tuple[str, str]], dict[str, str]]:
    """
    Normalize, deduplicate (case-insensitive), filter blanks.
    Returns:
      - alias_pairs: list of (original, lowercase) tuples
      - alias_cert_map: dict alias_lower -> cert_id
    """
    seen_lower: dict[str, str] = {}
    result: list[tuple[str, str]] = []
    alias_cert_map: dict[str, str] = {}

    for alias, cert_id in raw_aliases:
        normalized = _normalize_alias(alias)
        if not normalized:
            continue
        key = normalized.lower()
        if key not in seen_lower:
            seen_lower[key] = normalized
            result.append((normalized, key))
            alias_cert_map[key] = cert_id

    return result, alias_cert_map


# -- Stage 3B: Build Aho-Corasick automaton --

def _build_automaton(
    alias_pairs: list[tuple[str, str]],
) -> tuple[ahocorasick.Automaton, dict[str, str]]:
    """
    Build Aho-Corasick automaton and secondary index.

    alias_pairs: list of (original_normalized, lowercase) tuples.

    Returns:
      automaton: compiled Aho-Corasick automaton.
      alias_index: dict lowercase -> original-case alias.
    """
    A = ahocorasick.Automaton()
    alias_index: dict[str, str] = {}

    for original, lower in alias_pairs:
        # Store (original_case, lowercase) as value
        A.add_word(lower, (original, lower))
        alias_index[lower] = original

    if alias_pairs:
        A.make_automaton()

    return A, alias_index


def _normalize_for_tier2(text: str) -> str:
    """Normalize a string for Tier 2 matching: collapse ws, hyphens/underscores->space, lower."""
    import re
    t = text.lower()
    t = t.replace("-", " ").replace("_", " ")
    t = re.sub(r"\s+", " ", t).strip()
    return t


def _build_normalized_automaton(
    alias_pairs: list[tuple[str, str]],
) -> tuple[ahocorasick.Automaton, dict[str, str]]:
    """
    Build Aho-Corasick automaton from *normalized* alias forms for Tier 2.
    Returns (automaton, norm_index) where norm_index maps normalized_form -> original_alias.
    """
    A = ahocorasick.Automaton()
    norm_index: dict[str, str] = {}

    for original, _lower in alias_pairs:
        norm = _normalize_for_tier2(original)
        if norm and norm not in norm_index:
            A.add_word(norm, (original, norm))
            norm_index[norm] = original

    if norm_index:
        A.make_automaton()

    return A, norm_index


def _extract_special_tokens(alias_pairs: list[tuple[str, str]]) -> set[str]:
    """
    Build the alias_token_whitelist for Stage 2.
    Extracts alias substrings containing special characters (+, /, #, &, etc.)
    that must be protected during normalization.
    """
    special_chars = set("+-/.#&")
    tokens: set[str] = set()

    for original, _lower in alias_pairs:
        if any(c in original for c in special_chars):
            tokens.add(original)

    return tokens


# -- Stage 3C: Fetch certification names & build cert-name automaton --

async def _fetch_cert_names(pool) -> list[tuple[str, str]]:
    """
    Fetch certification names from public.certifications.
    Returns list of (name, cert_id) tuples.
    """
    query = "SELECT id, name FROM public.certifications WHERE name IS NOT NULL AND name != ''"

    result: list[tuple[str, str]] = []
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(query)
            rows = await cur.fetchall()
            result = [(row[1], row[0]) for row in rows]  # (name, cert_id)

    logger.info("Stage 3C: fetched %d cert names from certifications", len(result))
    return result


def _build_cert_name_automaton(
    cert_names: list[tuple[str, str]],
) -> tuple[ahocorasick.Automaton, dict[str, str], dict[str, str]]:
    """
    Build Aho-Corasick automaton from certification names.
    Returns (automaton, cert_name_index, cert_name_cert_map).
      cert_name_index: name_lower -> original name
      cert_name_cert_map: name_lower -> cert_id
    """
    A = ahocorasick.Automaton()
    cert_name_index: dict[str, str] = {}
    cert_name_cert_map: dict[str, str] = {}

    for name, cert_id in cert_names:
        normalized = _normalize_alias(name)
        if not normalized:
            continue
        key = normalized.lower()
        if key not in cert_name_index:
            A.add_word(key, (normalized, key))
            cert_name_index[key] = normalized
            cert_name_cert_map[key] = cert_id

    if cert_name_index:
        A.make_automaton()

    logger.info("Built cert-name automaton with %d entries", len(cert_name_index))
    return A, cert_name_index, cert_name_cert_map


# -- Combined Stage 3 entry point --

async def stage3_load_and_build(pool) -> Stage3Output:
    """
    Stage 3: Fetch aliases from DB and build Aho-Corasick automaton.

    Called at startup and on POST /reload-aliases.

    Returns Stage3Output with:
      - automaton: compiled Aho-Corasick automaton
      - alias_index: dict lowercase -> original case
      - alias_token_whitelist: set of alias strings with special chars
      - cert_name_automaton: automaton for certification names (full text scan)
      - stageoutput: metadata dict for DB recording
    """
    t0 = time.perf_counter()

    # Stage 3A: Fetch aliases from DB
    raw_aliases = await _fetch_aliases_from_db(pool)
    alias_pairs, alias_cert_map = _deduplicate_aliases(raw_aliases)

    fetch_ms = (time.perf_counter() - t0) * 1000

    # Stage 3B: Build alias automatons (primary + normalized for Tier 2)
    t1 = time.perf_counter()
    automaton, alias_index = _build_automaton(alias_pairs)
    automaton_norm, norm_index = _build_normalized_automaton(alias_pairs)
    alias_token_whitelist = _extract_special_tokens(alias_pairs)

    # Stage 3C: Fetch cert names & build cert-name automaton (full text scan)
    cert_names = await _fetch_cert_names(pool)
    cert_name_automaton, cert_name_index, cert_name_cert_map = _build_cert_name_automaton(cert_names)

    build_ms = (time.perf_counter() - t1) * 1000
    total_ms = (time.perf_counter() - t0) * 1000

    stageoutput: dict[str, Any] = {
        "raw_alias_count": len(raw_aliases),
        "deduped_alias_count": len(alias_pairs),
        "alias_table": ALIAS_TABLE,
        "alias_column": ALIAS_COLUMN,
        "special_token_count": len(alias_token_whitelist),
        "automaton_size": len(alias_index),
        "cert_name_count": len(cert_name_index),
        "fetch_ms": round(fetch_ms, 2),
        "build_ms": round(build_ms, 2),
        "execution_ms": round(total_ms, 2),
    }

    logger.info(
        "Stage 3 complete: %d aliases -> %d deduped, %d cert names, automaton built in %.1fms (total %.1fms)",
        len(raw_aliases), len(alias_pairs), len(cert_name_index), build_ms, total_ms,
    )

    return Stage3Output(
        automaton=automaton,
        automaton_norm=automaton_norm,
        alias_index=alias_index,
        norm_index=norm_index,
        alias_cert_map=alias_cert_map,
        cert_name_automaton=cert_name_automaton,
        cert_name_index=cert_name_index,
        cert_name_cert_map=cert_name_cert_map,
        alias_token_whitelist=alias_token_whitelist,
        stageoutput=stageoutput,
    )
