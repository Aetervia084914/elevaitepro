import asyncio
import logging
from app.core.async_db import _get_psycopg_url
from psycopg_pool import AsyncConnectionPool

logging.basicConfig(level=logging.DEBUG)

async def main():
    conninfo = _get_psycopg_url()
    print('CONNINFO:', conninfo)
    pool = AsyncConnectionPool(conninfo=conninfo, min_size=2, max_size=4, open=False)
    try:
        # try opening without wait and then explicitly acquire connections
        await pool.open(wait=False)
        print('pool.open(wait=False) returned')
        async with pool.connection() as conn:
            r = await conn.execute('SELECT 1')
            print('SELECT 1 OK')
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        try:
            await pool.close()
        except Exception:
            pass

if __name__ == '__main__':
    asyncio.run(main())
