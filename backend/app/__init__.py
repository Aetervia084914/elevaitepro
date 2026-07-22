"""elevAIte pro backend application package.

psycopg3 async cannot run on Windows' default ProactorEventLoop.  Setting the
policy here — at the very root of the ``app`` package — guarantees it fires
before *any* event loop is created, regardless of entry-point (run.py, uvicorn
CLI, pytest, ad-hoc scripts, etc.).
"""
import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
