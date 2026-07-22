"""Endpoint for recording API timing from external callers (e.g. Next.js routes)."""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.core.api_timing import record_api_time

logger = logging.getLogger(__name__)

router = APIRouter(tags=["api-timing"])


class TimingRecord(BaseModel):
    api_name: str = Field(..., description="API endpoint name, e.g. /api/clear-cache")
    time_taken_ms: float = Field(..., ge=0, description="Execution time in milliseconds")
    status: str = Field(default="success", description="success or error")


class TimingResponse(BaseModel):
    success: bool = True


@router.post("/record-api-time", response_model=TimingResponse)
async def post_record_api_time(body: TimingRecord) -> TimingResponse:
    """Record an API call's execution time into the apiresponse table."""
    await record_api_time(body.api_name, body.time_taken_ms, body.status)
    return TimingResponse(success=True)
