from __future__ import annotations

import json
import logging
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .openai_client import generate_json
from .schemas import OpenChatRequest, OpenChatResponse


app = FastAPI(title="openchat")

logger = logging.getLogger("openchat")

_log_dir = Path("serverlog")
_log_dir.mkdir(parents=True, exist_ok=True)
_log_file = _log_dir / "logs"

if not logging.getLogger().handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(_log_file, encoding="utf-8"),
        ],
    )

_allowed_origins_raw = os.getenv("CORS_ALLOW_ORIGINS", "*")
allowed_origins = (
    ["*"]
    if _allowed_origins_raw.strip() == "*"
    else [o.strip() for o in _allowed_origins_raw.split(",") if o.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model": settings.openai_model}


@app.post("/openchat", response_model=OpenChatResponse)
def openchat(req: OpenChatRequest) -> OpenChatResponse:
    try:
        logger.info(
            json.dumps(
                {
                    "event": "openchat_input",
                    "prompt": req.prompt,
                    "max_tokens": req.max_tokens,
                    "temperature": req.temperature,
                },
                ensure_ascii=False,
            )
        )
    except Exception:
        logger.info('{"event":"openchat_input","error":"failed_to_serialize"}')

    try:
        result = generate_json(
            prompt=req.prompt,
            max_tokens=req.max_tokens,
            temperature=req.temperature,
        )

        try:
            logger.info(
                json.dumps(
                    {"event": "openchat_output", "result": result},
                    ensure_ascii=False,
                )
            )
        except Exception:
            logger.info('{"event":"openchat_output","error":"failed_to_serialize"}')

        return OpenChatResponse(result=result, model=settings.openai_model)
    except RuntimeError as e:
        logger.exception(json.dumps({"event": "openchat_error", "error": str(e)}, ensure_ascii=False))
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception(json.dumps({"event": "openchat_error", "error": str(e)}, ensure_ascii=False))
        raise HTTPException(status_code=502, detail=f"OpenAI request failed: {e}")
