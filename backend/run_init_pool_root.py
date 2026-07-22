import asyncio
import logging
from app.core.async_db import init_async_pool, close_async_pool

logging.basicConfig(level=logging.DEBUG)


async def main():
    try:
        await init_async_pool()
        print('POOL_OPENED')
    except Exception:
        import traceback
        traceback.print_exc()
    finally:
        try:
            await close_async_pool()
        except Exception:
            pass


if __name__ == '__main__':
    asyncio.run(main())
