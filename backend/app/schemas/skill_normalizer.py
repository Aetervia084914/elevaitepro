"""Pydantic v2 models for the skill extraction pipeline (Stages 1-7)."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# -- Enums --------------------------------------------------------------------

class FileFormat(str, Enum):
    DOCX = "docx"
    DOC  = "doc"
    PDF  = "pdf"
    ODT  = "odt"
    ODS  = "ods"
    TXT  = "txt"


class ExtractionMethod(str, Enum):
    DETERMINISTIC = "deterministic"
    LLM_FALLBACK  = "llm_fallback"


class StageStatus(str, Enum):
    OK       = "ok"
    ERROR    = "error"
    SKIPPED  = "skipped"
    REJECTED = "rejected"


# -- Stage name -> number mapping ---------------------------------------------

STAGE_NUMBERS: dict[str, int] = {
    "1":      1,
    "2":      2,
    "3A":     3,
    "3B":     4,
    "3C":     5,
    "4":      6,
    "5":      7,
    "6":      8,
    "7":      9,
    "output": 10,
}


# -- Stage result audit row ---------------------------------------------------

class StageResultRow(BaseModel):
    """One row written to the stage_results table after each pipeline stage."""
    request_id:      uuid.UUID
    stage:           str
    status:          StageStatus = StageStatus.OK
    payload:         dict[str, Any] = Field(default_factory=dict)
    duration_ms:     int = 0
    error_message:   str | None = None
    extraction_type: str = "skill"

    @property
    def stage_number(self) -> int:
        return STAGE_NUMBERS.get(self.stage, 0)

    @property
    def stage_name(self) -> str:
        names = {
            "1":  "File Upload & Cache Check",
            "2":  "Text Extraction & Language Gate",
            "3A": "Exact Match & Alias Resolution",
            "3B": "Phrase Pattern Matching",
            "3C": "Semantic Embedding Similarity",
            "4":  "Confidence Scoring & Dedup",
            "5":  "LLM Fallback",
            "6":  "Validation & Persistence",
            "7":      "Industry & Job Level Profiling",
            "output": "Final Pipeline Output",
        }
        return names.get(self.stage, f"Stage {self.stage}")


# -- Skill candidate ---------------------------------------------------------

class SkillCandidate(BaseModel):
    """One candidate skill produced by stages 3A/3B/3C/5."""
    skill_id:       int
    canonical_name: str
    source_stage:   str
    confidence:     float
    matched_text:   str = ""


# -- Stage 7 profile models --------------------------------------------------

class IndustryMatch(BaseModel):
    """One inferred industry from the extracted skill set."""
    industry:    str
    confidence:  float
    skill_count: int


class OccupationDetail(BaseModel):
    """One specific occupation resolved under an occupation group."""
    occupation:      str
    confidence:      float
    skill_overlap:   int
    matching_skills: list[str] = Field(default_factory=list)


class OccupationMatch(BaseModel):
    """One inferred occupation group from the extracted skill set."""
    occupation_group: str
    confidence:       float
    skill_count:      int
    occupations:      list[OccupationDetail] = Field(default_factory=list)


class BestOccupation(BaseModel):
    """The single best-matched occupation resolved from skill overlap."""
    occupation:       str
    occupation_group: str
    confidence:       float
    skill_overlap:    int
    matching_skills:  list[str] = Field(default_factory=list)


class BestMatch(BaseModel):
    """Top-1 picks derived from the skill extraction confidence scores."""
    best_industry:   str            = ""
    industry_confidence: float      = 0.0
    best_occupation: BestOccupation | None = None
    best_job_level:  str            = ""
    job_level_confidence: float     = 0.0


class JobLevelResult(BaseModel):
    """Inferred seniority band from ONET importance + skill-type signals."""
    level:           str
    confidence:      float
    onet_avg:        float
    evidence_skills: list[str]


# -- Pipeline context ---------------------------------------------------------

class PipelineContext(BaseModel):
    """Mutable state bag carried through all stages for a single request."""
    # Stage 1
    request_id:      uuid.UUID = Field(default_factory=uuid.uuid4)
    session_id:      uuid.UUID | None = None
    content_hash:    str = ""
    file_format:     FileFormat | None = None
    file_size_bytes: int = 0
    cache_hit:       bool = False

    # Stage 2
    raw_text:            str = ""
    detected_language:   str = ""
    extraction_method:   str = ""
    original_char_count: int = 0
    truncated:           bool = False

    # Stages 3-6
    candidates:       list[SkillCandidate] = Field(default_factory=list)
    matched_spans:    list[tuple[int, int]] = Field(default_factory=list)
    final_skills:     list[str] = Field(default_factory=list)
    final_skill_ids:  list[int] = Field(default_factory=list)
    final_method:     ExtractionMethod = ExtractionMethod.DETERMINISTIC
    skill_count:      int = 0

    # Stage 7
    industries:        list[IndustryMatch]   = Field(default_factory=list)
    occupation_groups: list[OccupationMatch] = Field(default_factory=list)
    job_level:         JobLevelResult | None = None

    # Audit trail
    stage_results: list[StageResultRow] = Field(default_factory=list)

    def add_stage_result(self, **kwargs: Any) -> None:
        """Helper to append a stage result with the current request_id."""
        self.stage_results.append(
            StageResultRow(request_id=self.request_id, **kwargs)
        )

    def accepted_candidates(self) -> list[SkillCandidate]:
        """Return candidates sorted by confidence descending."""
        return sorted(self.candidates, key=lambda c: c.confidence, reverse=True)


# -- API response -------------------------------------------------------------

class ExtractSkillsResponse(BaseModel):
    """HTTP 200 JSON response from POST /extract-skills."""
    skills:            list[str]
    request_id:        uuid.UUID
    skill_count:       int
    extraction_method: str
    cache_hit:         bool = False
    best_match:        BestMatch | None = None
    industries:        list[IndustryMatch]   = Field(default_factory=list)
    occupation_groups: list[OccupationMatch] = Field(default_factory=list)
    job_level:         JobLevelResult | None = None


_INDUSTRY_TO_ISCO_KEYWORDS: dict[str, list[str]] = {
    "information technology":   ["information and communications", "ict ", "software", "database"],
    "engineering":              ["science and engineering", "engineering"],
    "engineering & technology": ["science and engineering", "technician", "engineering"],
    "finance":                  ["business and administration", "financial", "accounting"],
    "business & management":    ["business and administration", "administrative", "management"],
    "marketing & sales":        ["sales", "marketing", "service and sales", "services and sales", "commercial", "business and administration"],
    "design & creative":        ["design", "arts", "creative", "media"],
    "human resources":          ["human resource", "administration", "business and administration"],
    "data & analytics":         ["information and communications", "science and engineering", "database"],
    "customer service":         ["service and sales", "services and sales", "clerical"],
    "professional services":    ["business and administration", "science and engineering", "legal"],
    "administrative & clerical": ["clerical", "administrative", "general and keyboard"],
    "manufacturing & trades":   ["craft and related", "metal", "building", "manufacturing"],
    "manufacturing & operations": ["plant and machine", "stationary", "assembler"],
    "manufacturing":            ["craft and related", "metal", "building", "plant and machine", "assembler", "manufacturing", "science and engineering"],
    "education":                ["teaching", "education", "training"],
    "agriculture & environment": ["agricultural", "forestry", "fishery"],
    "defence & security":       ["armed forces", "protective", "security"],
    "healthcare":               ["health", "medical", "nursing", "pharmaceutical"],
    "logistics & supply chain": ["clerical", "administrative", "plant and machine", "drivers", "transport"],
}


def _group_matches_industry(group_name: str, industry: str) -> bool:
    """Check if an ISCO occupation group name is relevant to the industry."""
    keywords = _INDUSTRY_TO_ISCO_KEYWORDS.get(industry.lower(), [])
    group_lower = group_name.lower()
    return any(kw in group_lower for kw in keywords)


def compute_best_match(
    industries: list[IndustryMatch],
    occupation_groups: list[OccupationMatch],
    job_level: JobLevelResult | None,
) -> BestMatch:
    """Post-processing layer: pick the single best industry, occupation,
    and job level from the confidence-scored pipeline output.

    Uses industry→ISCO cross-referencing to boost occupations from
    groups that align with the detected industry.
    """

    # ── Best industry (highest confidence) ───────────────────────────
    best_ind = ""
    best_ind_conf = 0.0
    if industries:
        top_ind = max(industries, key=lambda i: i.confidence)
        best_ind = top_ind.industry
        best_ind_conf = top_ind.confidence

    # ── Best occupation: industry-aware ranking ──────────────────────
    best_occ: BestOccupation | None = None
    best_score = -1.0

    for grp in occupation_groups:
        # Cross-reference ONLY with the #1 industry for boost/penalty
        ind_match = _group_matches_industry(grp.occupation_group, best_ind)
        top_is_it = best_ind.lower() in ("information technology", "data & analytics")
        if ind_match:
            overlap_mult = 1.8      # industry-aligned overlaps boosted
            conf_bonus   = 0.20
        elif not top_is_it:
            overlap_mult = 0.65     # penalise unrelated groups when industry ≠ IT
            conf_bonus   = 0.0
        else:
            overlap_mult = 1.0      # neutral for IT-top resumes
            conf_bonus   = 0.0

        for occ in grp.occupations:
            # Composite score: overlap is king (boosted if industry-aligned)
            score = (
                occ.skill_overlap * overlap_mult    # primary: overlap × industry factor
                + grp.confidence * 0.4              # group-level confidence
                + occ.confidence * 0.3              # occupation-level confidence
                + conf_bonus                        # industry alignment bonus
            )
            if score > best_score:
                best_score = score
                composite_conf = round(
                    0.5 * grp.confidence
                    + 0.3 * occ.confidence
                    + (0.2 if ind_match else 0.0),
                    4,
                )
                best_occ = BestOccupation(
                    occupation=occ.occupation,
                    occupation_group=grp.occupation_group,
                    confidence=min(composite_conf, 0.99),
                    skill_overlap=occ.skill_overlap,
                    matching_skills=occ.matching_skills,
                )

    # If no nested occupations, fall back to the top occupation_group
    if best_occ is None and occupation_groups:
        top_grp = max(occupation_groups, key=lambda g: g.confidence)
        best_occ = BestOccupation(
            occupation=top_grp.occupation_group,
            occupation_group=top_grp.occupation_group,
            confidence=top_grp.confidence,
            skill_overlap=top_grp.skill_count,
            matching_skills=[],
        )

    # ── Best job level ──────────────────────────────────────────────
    best_jl = ""
    best_jl_conf = 0.0
    if job_level:
        best_jl = job_level.level
        best_jl_conf = job_level.confidence

    return BestMatch(
        best_industry=best_ind,
        industry_confidence=best_ind_conf,
        best_occupation=best_occ,
        best_job_level=best_jl,
        job_level_confidence=best_jl_conf,
    )
