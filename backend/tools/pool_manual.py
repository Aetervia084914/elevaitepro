import asyncio
import traceback
import sys
sys.path.insert(0, '')
from app.core.async_db import _get_psycopg_url
from psycopg_pool import AsyncConnectionPool

async def main():
    s = _get_psycopg_url()
    print('CONNINFO:', s)
    pool = AsyncConnectionPool(conninfo=s, min_size=2, max_size=4, open=False)
    try:
        await pool.open(wait=False)
        print('pool.open(wait=False) returned')
        for i in range(4):
            try:
                async with pool.connection() as conn:
                    await conn.execute('SELECT 1')
                    print('conn', i, 'ok')
            except Exception:
                traceback.print_exc()
    except Exception:
        traceback.print_exc()
    finally:
        await pool.close()

if __name__ == '__main__':
    asyncio.run(main())
