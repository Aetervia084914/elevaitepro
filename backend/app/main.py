import asyncio
import sys
from contextlib import asynccontextmanager

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.routes.auth import router as auth_router
from app.api.routes.forget_password import router as forget_password_router
from app.api.routes.submitticket import router as submitticket_router
from app.api.routes.resume_upload import router as resume_upload_router
from app.api.routes.certification import router as certification_router
from app.api.routes.dropdowns import router as dropdowns_router
from app.api.routes.health import router as health_router
from app.api.routes.skill_normalizer import router as skill_normalizer_router
from app.api.routes.tool_normalizer import router as tool_normalizer_router
from app.api.routes.skill_extract import router as skill_extract_router
from app.api.routes.get_future_roles import router as future_roles_router
from app.api.routes.get_analysis import router as analysis_router
from app.api.routes.api_timing import router as api_timing_router
from app.api.routes.resume_export import router as resume_export_router
from app.api.routes.getresume_futureroles import router as future_role_prediction_router
from app.api.routes.candidate_cache_read import router as candidate_cache_router
from app.api.routes.cache_analysis import router as cache_analysis_router
from app.api.routes.userjourney import router as userjourney_router
from app.api.routes.advance_journey import router as advance_journey_router
from app.api.routes.payment import router as payment_router
from app.api.routes.db_routes import router as db_routes_router
from app.api.routes.completed_gaps import router as completed_gaps_router
from app.api.routes.verification_code import router as verification_code_router
from app.api.routes.clear_candidate_data import router as clear_candidate_data_router
from app.api.role_analysis import router as role_analysis_router
from app.api.get_summary_pdf import router as summary_pdf_router
from app.api.generatesummarypdf import router as generate_summary_pdf_router
from app.api.generateresumepdf import router as generate_resume_pdf_router
from app.api.generate_resume import router as generate_resume_router
from app.core.async_db import close_async_pool, init_async_pool
from app.core.logging import configure_logging, get_logger


configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_async_pool()
    except Exception:
        logger.exception("Async DB pool startup failed — endpoints will be degraded")

    # Startup: ensure support_tickets table + sequence exist
    try:
        from app.db.session import SessionLocal
        from app.repositories.support_repository import ensure_support_tickets_schema
        with SessionLocal() as _session:
            ensure_support_tickets_schema(_session)
        logger.info("Support tickets schema ready")
    except Exception:
        logger.exception("Support tickets schema ensure failed — /submitticket may be degraded")

    yield

    await close_async_pool()


app = FastAPI(
    title="elevAIte pro Backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error on {request.url.path}")
    logger.error(f"Request method: {request.method}")
    logger.error(f"Error details: {exc.errors()}")
    logger.error(f"Request body raw: {await request.body()}")

    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "body": str(exc.raw_data if hasattr(exc, 'raw_data') else "No body")
        },
    )


app.include_router(health_router)
app.include_router(dropdowns_router)
app.include_router(auth_router)
app.include_router(payment_router)
app.include_router(verification_code_router)
app.include_router(forget_password_router)
app.include_router(submitticket_router)
app.include_router(certification_router)
app.include_router(skill_normalizer_router)
app.include_router(tool_normalizer_router)
app.include_router(resume_upload_router)
app.include_router(skill_extract_router)
app.include_router(future_roles_router)
app.include_router(analysis_router)
app.include_router(api_timing_router)
app.include_router(resume_export_router)
app.include_router(future_role_prediction_router)
app.include_router(candidate_cache_router)
app.include_router(cache_analysis_router)
app.include_router(userjourney_router)
app.include_router(advance_journey_router)
app.include_router(role_analysis_router)
app.include_router(summary_pdf_router)
app.include_router(generate_summary_pdf_router)
app.include_router(generate_resume_pdf_router)
app.include_router(generate_resume_router)
app.include_router(db_routes_router)
app.include_router(completed_gaps_router)
app.include_router(clear_candidate_data_router)
