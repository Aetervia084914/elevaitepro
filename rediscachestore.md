# Redis Cache Store — Complete Key Reference

Only the Resume Upload service writes to Redis. All other services had their Redis cache writes removed.

---

## 1. Resume Upload (`backend/app/api/routes/resume_upload.py`) — ACTIVE

| Key Pattern | Example | TTL | Data Stored |
|---|---|---|---|
| `resume:sections:<content_hash>` | `resume:sections:a3f9b2...` | 3600s (1 hr) | `{ raw_text, work_experience, education, skills, certifications, ..., _sections_found }` — all detected resume sections plus the raw text |
| `resume:spacy_cleaned:<content_hash>` | `resume:spacy_cleaned:a3f9b2...` | 3600s (1 hr) | `{ cleaned_text, sentences[], token_count, sentence_count, entities[], entity_count, processing_ms }` — spaCy NLP output |

- **Set by**: `set_cached_json()` from `app/core/redis.py`
- **Cleared by**: `clearAllCache()` patterns `resume:sections:*` and `resume:spacy_cleaned:*`

---

## Removed Redis Cache Writes

The following services **no longer write to Redis**. Data is returned directly in API responses.

| Service | Old Key Pattern | Removed From |
|---|---|---|
| Skill Normalizer (Stage 6) | `skills:<hash>` | `pipeline.py` → `cache_set()` |
| Skill Normalizer (Stage 5 LLM) | `llm_skills:<hash>` | `pipeline.py` → `redis_client.setex()` |
| Certification Stage 5 | `match_result:<hash>` | `stage5_response.py` → `_cache_result()` |
| Future Roles | `future_roles:response`, `future_roles:role:<name>` | `get_future_roles.py` → `set_cached_json()` |
| GetAnalysis (Node.js) | `analysis_cache:<role>`, `analysis_cache:all_roles` | `GetAnalysis/route.js` → `cacheAnalysis()` |
| GetAnalysis (Python) | `analysis_cache:<role>`, `analysis_cache:all_roles` | `get_analysis.py` → `set_cached_json()` |
| Dropdown | `dropdown:industries`, `dropdown:job_titles:<name>` | `dropdown_service.py` → `set_cached_json()` |
| Tool Normalizer Pipeline | `future_roles:v2:<hash>`, `tool_extraction:v1:<hash>` | `cache_service.py` → `set_json()` (no-op) |

---

## Cache Clearing Summary (`lib/redisClient.js` → `clearAllCache()`)

Called via `POST /api/clear-cache` at the start of every new resume upload.

| Pattern in `clearAllCache()` | Purpose |
|---|---|
| `resume:sections:*` | Active — resume section detection cache |
| `resume:spacy_cleaned:*` | Active — resume spaCy NLP cache |
| `future_roles:*` | Stale sweep — caching removed |
| `analysis_cache:*` | Stale sweep — caching removed |
| `skills:*` | Stale sweep — caching removed |
| `llm_skills:*` | Stale sweep — caching removed |
| `match_result:*` | Stale sweep — caching removed |
| `future_roles:v2:*` | Stale sweep — caching removed |
| `tool_extraction:v1:*` | Stale sweep — caching removed |
| `dropdown:*` | Stale sweep — caching removed |

---

## Redis Connection Details

| Layer | Client | Connection |
|---|---|---|
| **Node.js** (`lib/redisClient.js`) | `ioredis` | `REDIS_URL` env var or `redis://localhost:6379/0` |
| **Python sync** (`app/core/redis.py`) | `redis-py` | `REDIS_HOST` + `REDIS_PORT` env vars |
| **Python async** (`skill_normalizer/redis_cache.py`) | `redis.asyncio` | `REDIS_URL` env var or `redis://localhost:6379/0` |
| **Tool normalizer** (`cache_service.py`) | `redis-py` | `REDIS_URL` from settings |
