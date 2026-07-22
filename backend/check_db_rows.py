import sys
sys.path.append('.')
from app.core.config import get_settings
from app.db.session import engine
from sqlalchemy import text

conn = engine.connect()
print('Recent user_cv_upload rows:')
rows = conn.execute(text("""
SELECT id, session_id, candidate_id, filename, content_hash, created_at, location
FROM public.user_cv_upload
ORDER BY created_at DESC
LIMIT 10
""")).fetchall()
for row in rows:
    print(row)

print('\nRecent role_analyses rows:')
rows2 = conn.execute(text("""
SELECT id, candidate_id, target_role, region, created_at
FROM public.role_analyses
ORDER BY created_at DESC
LIMIT 20
""")).fetchall()
for row in rows2:
    print(row)

conn.close()
