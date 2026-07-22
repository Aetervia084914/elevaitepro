import asyncio
import traceback
import sys
sys.path.insert(0, '')
from app.core.async_db import _get_psycopg_url
import psycopg

async def main():
    s = _get_psycopg_url()
    print('CONNINFO:', s)
    try:
        conn = await psycopg.AsyncConnection.connect(s)
        print('ASYNC CONNECTED')
        await conn.close()
    except Exception:
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(main())
