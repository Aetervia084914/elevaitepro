"""Launch the Elevaite backend server.

Sets the Windows-compatible event loop policy before uvicorn starts.

Usage:
    python run.py
"""
import asyncio
import sys

# psycopg async requires SelectorEventLoop on Windows
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import uvicorn
from app.core.config import get_settings


def main() -> None:
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.fastapi_host,
        port=settings.fastapi_port,
        loop="none",
        reload=False,
    )


if __name__ == "__main__":
    main()
