import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.api.routes import db_routes
from app.api.routes.db_routes import SaveFutureRolesRequest


class _FakeCursor:
    def __init__(self, result=None):
        self._result = result

    async def fetchone(self):
        return self._result


class _FakeConnection:
    def __init__(self):
        self.queries = []

    async def execute(self, query, params=None):
        self.queries.append((str(query), params))
        if "SELECT id FROM userjourney" in str(query).lower():
            return _FakeCursor(("journey-1",))
        return _FakeCursor(None)

    async def commit(self):
        return None


class _FakeConnContext:
    def __init__(self, conn):
        self.conn = conn

    async def __aenter__(self):
        return self.conn

    async def __aexit__(self, exc_type, exc, tb):
        return False


def test_save_future_roles_updates_user_cv_upload(monkeypatch):
    conn = _FakeConnection()

    def fake_get_async_conn():
        return _FakeConnContext(conn)

    monkeypatch.setattr(db_routes, "get_async_conn", fake_get_async_conn)

    result = asyncio.run(
        db_routes.save_future_roles(
            SaveFutureRolesRequest(candidateId="candidate-1", roles=["AI Engineer"])
        )
    )

    assert result["success"] is True
    assert any("update user_cv_upload" in query.lower() for query, _ in conn.queries)
