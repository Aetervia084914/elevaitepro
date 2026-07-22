import sys
sys.path.append('.')
from app.core.config import get_settings
from app.db.session import engine
from sqlalchemy import text

print('DATABASE_URL present:', bool(get_settings().database_url))
conn = engine.connect()
print('connected ok')
print('user_cv_upload exists:', conn.execute(text("SELECT to_regclass('public.user_cv_upload')")).scalar())
print('role_analyses exists:', conn.execute(text("SELECT to_regclass('public.role_analyses')")).scalar())
print('user_cv_upload columns:', [r[0] for r in conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='user_cv_upload' ORDER BY ordinal_position")).fetchall()])
conn.close()
