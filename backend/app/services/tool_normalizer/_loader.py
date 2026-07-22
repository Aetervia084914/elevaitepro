"""One-time loader for the tool_normalizer package.

Temporarily swaps ``sys.modules`` so that the tool_normalizer's internal
``from app.*`` imports resolve against ``tool_normalizer/app/`` instead of the
main backend's ``app/`` package.  After loading, the original ``app`` modules
are restored.

This approach avoids copying 30+ service files while keeping both packages
isolated at runtime.  Must be called **once** at application startup (inside
the lifespan context) before any concurrent requests.
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path
from types import ModuleType
from typing import Any

logger = logging.getLogger(__name__)

# Absolute path to the tool_normalizer root (contains app/ subdirectory)
TN_ROOT: Path = Path(__file__).resolve().parents[3] / "tool_normalizer"

# Private registry of loaded tool_normalizer objects
_registry: dict[str, Any] = {}


def _is_loaded() -> bool:
    return bool(_registry)


def load_tool_normalizer_modules() -> None:
    """Import all tool_normalizer modules under a temporary ``app`` swap.

    After this call every needed class / function is accessible via
    :func:`get`.  The function is idempotent — subsequent calls are no-ops.
    """
    if _is_loaded():
        return

    if not TN_ROOT.is_dir():
        raise ImportError(
            f"tool_normalizer package not found at {TN_ROOT} — skipping"
        )

    logger.info("Loading tool_normalizer modules from %s …", TN_ROOT)

    # ── 1. Save the main backend's app.* module tree ─────────────────────
    saved: dict[str, ModuleType] = {}
    for key in list(sys.modules):
        if key == "app" or key.startswith("app."):
            saved[key] = sys.modules.pop(key)

    original_path = sys.path[:]

    try:
        # ── 2. Inject tool_normalizer/ at the front of sys.path ──────────
        tn_root_str = str(TN_ROOT)
        sys.path.insert(0, tn_root_str)

        # ── 3. Import everything we need (triggers recursive resolution) ─
        # Core infrastructure
        from app.core.config import get_settings as tn_get_settings            # noqa: E402
        from app.db.session import build_engine, build_session_factory         # noqa: E402
        from app.repositories.pipeline_repository import PipelineRepository    # noqa: E402
        from app.schemas.common import SessionStatus, StageStatus              # noqa: E402
        from app.schemas.api import FutureRolesRequest, FutureRolesResponse    # noqa: E402

        # Pipeline + orchestrator
        from app.pipeline.context import PipelineContext                        # noqa: E402
        from app.pipeline.orchestrator import (                                # noqa: E402
            FutureRolesPipelineOrchestrator,
            PipelineExecutionError,
            PipelineExecutionResult,
        )

        # Services needed by the orchestrator constructor / build_pipeline
        from app.services.dataset_service import DatasetService                # noqa: E402
        from app.services.normalization_service import NormalizationService     # noqa: E402
        from app.services.cache_service import CacheService                    # noqa: E402
        from app.services.role_resolution_service import RoleResolutionService # noqa: E402
        from app.services.signal_extraction_service import SignalExtractionService  # noqa: E402
        from app.services.seniority_service import SeniorityService            # noqa: E402
        from app.services.neo4j_service import Neo4jService                    # noqa: E402
        from app.services.vector_service import VectorService                  # noqa: E402
        from app.services.candidate_merge_service import CandidateMergeService # noqa: E402
        from app.services.ranking_service import RankingService                # noqa: E402
        from app.services.response_service import ResponseService              # noqa: E402

        # Store references
        _registry.update(
            get_settings=tn_get_settings,
            build_engine=build_engine,
            build_session_factory=build_session_factory,
            PipelineRepository=PipelineRepository,
            SessionStatus=SessionStatus,
            StageStatus=StageStatus,
            FutureRolesRequest=FutureRolesRequest,
            FutureRolesResponse=FutureRolesResponse,
            PipelineContext=PipelineContext,
            FutureRolesPipelineOrchestrator=FutureRolesPipelineOrchestrator,
            PipelineExecutionError=PipelineExecutionError,
            PipelineExecutionResult=PipelineExecutionResult,
            DatasetService=DatasetService,
            NormalizationService=NormalizationService,
            CacheService=CacheService,
            RoleResolutionService=RoleResolutionService,
            SignalExtractionService=SignalExtractionService,
            SeniorityService=SeniorityService,
            Neo4jService=Neo4jService,
            VectorService=VectorService,
            CandidateMergeService=CandidateMergeService,
            RankingService=RankingService,
            ResponseService=ResponseService,
        )

        logger.info("Tool normalizer modules loaded successfully (%d refs)", len(_registry))

    finally:
        # ── 4. Restore the main backend's app.* modules ──────────────────
        for key in list(sys.modules):
            if key == "app" or key.startswith("app."):
                sys.modules.pop(key, None)
        sys.modules.update(saved)

        # Restore sys.path
        sys.path[:] = original_path


def get(name: str) -> Any:
    """Retrieve a loaded tool_normalizer object by registry key."""
    if not _registry:
        raise RuntimeError(
            "Tool normalizer modules not loaded. "
            "Call load_tool_normalizer_modules() at startup first."
        )
    return _registry[name]
