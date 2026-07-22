"""Tool Normalizer — startup / lifespan helpers.

Initialises the tool extraction pipeline resources (sync SQLAlchemy engine,
session factory, repository wrapper, orchestrator) and stores them on
``app.state`` for consumption by the API routes.
"""
from __future__ import annotations

import logging

from fastapi import FastAPI
from sqlalchemy import text

from app.core.config import get_settings as main_get_settings
from app.services.tool_normalizer._loader import get, load_tool_normalizer_modules
from app.services.tool_normalizer.repository_wrapper import ToolPipelineRepository

logger = logging.getLogger(__name__)


async def init_tool_normalizer(app: FastAPI) -> None:
    """Initialise all tool normalizer resources.

    Call this inside the application lifespan **after** the main backend's
    ``app.*`` modules have been imported (so ``sys.modules`` is stable).
    """
    # ── 1. Load tool_normalizer modules (one-time) ───────────────────────
    load_tool_normalizer_modules()

    # ── 2. Build sync SQLAlchemy engine using the same DATABASE_URL ──────
    settings = main_get_settings()
    db_url = settings.database_url
    # psycopg driver: strip async suffix if present
    if "+psycopg" in db_url:
        db_url = db_url.replace("+psycopg", "")
    # Ensure SQLAlchemy-compatible URL scheme
    if db_url.startswith("postgresql://"):
        sa_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)
    elif db_url.startswith("postgresql+psycopg://"):
        sa_url = db_url
    else:
        sa_url = db_url

    build_engine = get("build_engine")
    build_session_factory = get("build_session_factory")

    # build_engine expects a Settings-like object with .database_url
    class _MinimalSettings:
        database_url = sa_url

    engine = build_engine(_MinimalSettings())
    # Verify connectivity
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    session_factory = build_session_factory(engine)

    # ── 3. Create the repository wrapper (extraction_type='tools') ───────
    repository = ToolPipelineRepository(session_factory)

    # ── 4. Build minimal services for Stage 2 (NormalizationService) ─────
    tn_get_settings = get("get_settings")
    tn_settings = tn_get_settings()

    DatasetService = get("DatasetService")
    NormalizationService = get("NormalizationService")

    try:
        datasets = DatasetService(tn_settings)
        norm_service = NormalizationService(datasets)
    except Exception:
        logger.exception(
            "Tool normalizer: DatasetService/NormalizationService init failed "
            "— pipeline Stage 2 will use basic text passthrough"
        )
        datasets = None
        norm_service = None

    # ── 5. Stub services not needed for tool extraction (stages 3-10) ────
    #   The orchestrator constructor requires them but build_pipeline()
    #   only creates stages 1-2.  Pass None; they're never invoked.
    RoleResolutionService = get("RoleResolutionService")
    SignalExtractionService = get("SignalExtractionService")
    SeniorityService = get("SeniorityService")
    Neo4jService = get("Neo4jService")
    VectorService = get("VectorService")
    CandidateMergeService = get("CandidateMergeService")
    RankingService = get("RankingService")
    ResponseService = get("ResponseService")
    CacheService = get("CacheService")

    # Cache service (Redis, optional)
    try:
        cache_service = CacheService(
            redis_url=tn_settings.redis_url,
            ttl_seconds=tn_settings.cache_ttl_seconds,
            namespace="tool_extraction:v1",
        )
    except Exception:
        logger.warning("Tool normalizer: Redis unavailable — caching disabled")
        cache_service = CacheService.__new__(CacheService)
        cache_service._client = None
        cache_service._ttl_seconds = 0
        cache_service._namespace = "tool_extraction:v1"
        cache_service._logger = logger

    # ── 6. Create orchestrator with ToolPipelineRepository ───────────────
    FutureRolesPipelineOrchestrator = get("FutureRolesPipelineOrchestrator")

    try:
        orchestrator = FutureRolesPipelineOrchestrator(
            repository=repository,
            datasets=datasets,
            normalization_service=norm_service,
            role_resolution_service=None,
            signal_extraction_service=None,
            seniority_service=None,
            neo4j_service=None,
            vector_service=None,
            candidate_merge_service=None,
            ranking_service=None,
            response_service=None,
            max_future_roles=tn_settings.max_future_roles,
            max_top_roles=tn_settings.max_top_roles,
            min_role_confidence=tn_settings.min_role_confidence,
        )
    except Exception:
        logger.exception("Tool normalizer: orchestrator creation failed")
        orchestrator = None

    # ── 7. Store on app.state ────────────────────────────────────────────
    app.state.tn_orchestrator = orchestrator
    app.state.tn_cache_service = cache_service
    app.state.tn_settings = tn_settings
    app.state.tn_repository = repository
    app.state.tn_engine = engine

    logger.info(
        "Tool normalizer ready — orchestrator=%s, cache=%s, request_timeout=%ds",
        "ok" if orchestrator else "FAILED",
        "ok" if cache_service and cache_service.is_available() else "unavailable",
        tn_settings.request_timeout_seconds,
    )


async def shutdown_tool_normalizer(app: FastAPI) -> None:
    """Dispose of tool normalizer resources."""
    engine = getattr(app.state, "tn_engine", None)
    if engine is not None:
        engine.dispose()
        logger.info("Tool normalizer engine disposed")
