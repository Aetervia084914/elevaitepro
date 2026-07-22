import asyncio
import sys
sys.path.append('g:/elevaitepro/backend')
from app.core.async_db import _get_psycopg_url
from psycopg_pool import AsyncConnectionPool

async def main():
    conninfo = _get_psycopg_url()
    print('CONNINFO:', conninfo)
    pool = AsyncConnectionPool(conninfo=conninfo, min_size=2, max_size=4, open=False)
    try:
        await pool.open(wait=False)
        print('pool.open returned')
        async with pool.connection() as conn:
            await conn.execute('SELECT 1')
            print('SELECT 1 OK')
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        try:
            await pool.close()
        except Exception:
            pass

asyncio.run(main())
