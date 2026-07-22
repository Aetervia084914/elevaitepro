from __future__ import annotations

from typing import Any, Dict

from pydantic import BaseModel, Field


class OpenChatRequest(BaseModel):
    prompt: str = Field(..., description="Prompt text that will be provided to the model")
    max_tokens: int = Field(default=1500, ge=1, le=16000, description="Maximum output tokens")
    temperature: float = Field(default=0.2, ge=0.0, le=2.0, description="Sampling temperature (lower = more deterministic)")


class OpenChatResponse(BaseModel):
    result: Dict[str, Any]
    model: str
