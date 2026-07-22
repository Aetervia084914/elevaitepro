"""Pydantic request/response schemas for the certification normalization API."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class MatchDetailResponse(BaseModel):
    """Per-alias match detail in the API response."""
    count: int
    match_tier: str
    confidence: float
    positions: list[dict[str, int]]


class MetaResponse(BaseModel):
    """Pipeline metadata in the API response."""
    file_format: str
    pipeline_status: str = "completed"
    processing_ms: int
    stage_count: int = 5
    fuzzy_enabled: bool = False
    normalizations_applied: list[str] = Field(default_factory=list)
    tier1_exact: int = 0
    tier2_normalized: int = 0
    tier3_fuzzy: int = 0


class CertificationMatchedAlias(BaseModel):
    """An alias that matched within a certification."""
    alias: str
    count: int
    match_tier: str
    confidence: float
    positions: list[dict[str, int]]


class CertificationResult(BaseModel):
    """A certification resolved from matched aliases."""
    cert_id: str
    name: str
    abbreviation: Optional[str] = None
    issuing_body: str
    level: str
    matched_aliases: list[CertificationMatchedAlias] = Field(default_factory=list)


class MatchAliasesResponse(BaseModel):
    """Final API response model for /match-aliases."""
    request_id: str
    total_aliases_checked: int
    total_found: int
    found: list[str]
    details: dict[str, MatchDetailResponse]
    certifications: list[CertificationResult] = Field(default_factory=list)
    meta: MetaResponse


class ReloadAliasesResponse(BaseModel):
    """Response for /reload-aliases admin endpoint."""
    status: str
    alias_count: int
    rebuild_ms: int
