import asyncio,traceback,sys
sys.path.insert(0,'')
from app.core.async_db import _get_psycopg_url
from psycopg_pool import AsyncConnectionPool

async def main():
    s=_get_psycopg_url()
    print('CONNINFO:', s)
    pool=AsyncConnectionPool(conninfo=s, min_size=1, max_size=1, open=False)
    try:
        conn=await pool._connect()
        print('CONNECTED internal:', conn)
        await conn.close()
    except Exception:
        traceback.print_exc()

if __name__=='__main__':
    asyncio.run(main())
