# Database Insert Diagnostic Guide

## Issue: Entries Not Inserting into Database Tables

You reported that entries are not being inserted into these tables:
- `public.user_cv_upload`
- `public.useranalysis`
- `public.usercompletedgaps`
- `public.userjourney`

## Understanding the Data Flow

### 1. `user_cv_upload` Table
**Populated by**: `/uploadresume` endpoint (background task)
**File**: `backend/app/api/routes/resume_upload.py` line 485-504
**Function**: `_persist_cv_upload()` (line 126-219)

**How it works**:
- Triggered as a FastAPI background task (line 485)
- Runs AFTER the HTTP response is sent to the client
- Inserts CV data including work experience, contact info, future roles

**Success indicator**: Log message `"[uploadresume] user_cv_upload persisted — session=..."`

---

### 2. `userjourney` Table
**Populated by**: `/api/create-candidate-journey` OR `/api/advance-journey` endpoints
**File**: `backend/app/api/routes/db_routes.py`

**How it works**:
- Created when a user starts their journey (after payment)
- Tracks: `current_stage`, `credits_remaining`, `cv_uploaded`, `analysis_completed_at`
- Updated when user progresses through stages

**NOT populated by /uploadresume** - This is a separate flow!

---

### 3. `useranalysis` Table
**Populated by**: `/api/create-candidate-analysis` endpoint
**File**: `backend/app/api/routes/db_routes.py` line 122-129

**How it works**:
- Created when analysis is requested for a specific role
- Stores the full LLM analysis response for a target role
- Links to `userjourney` and `role_analyses` tables

**NOT populated by /uploadresume** - This happens AFTER CV upload!

---

### 4. `usercompletedgaps` Table
**Populated by**: `/api/completed-gaps` endpoint (POST request)
**File**: `backend/app/api/routes/completed_gaps.py` line 110-115

**How it works**:
- Created when user marks a skill/certification/course as completed
- Tracks progress on gap-filling activities
- Links to `user_cv_upload` table

**NOT populated by /uploadresume** - This is user interaction data!

---

## Diagnostic Steps

### Step 1: Check if `user_cv_upload` Inserts Are Happening

**Check application logs** for this message:
```
[uploadresume] user_cv_upload persisted — session=<session_id>, hash=<content_hash>
```

**If you DON'T see this message**, one of these issues is occurring:

#### Issue A: Background Task Not Executing
**Symptoms**: Response succeeds but background task never runs
**Causes**:
- FastAPI background tasks require the application to stay running
- If the server shuts down immediately after response, background tasks are lost
- Using uvicorn with --reload can sometimes kill background tasks

**Solution**:
```python
# Add logging at the START of _persist_cv_upload
def _persist_cv_upload(...):
    logger.info("[_persist_cv_upload] STARTING - session=%s", session_id)
    try:
        # ... existing code
```

#### Issue B: Database Connection Failure
**Symptoms**: Log shows `"Could not persist user_cv_upload: <error>"`
**Causes**:
- Database credentials incorrect in env variables
- Database not accessible from backend
- SessionLocal() not configured correctly

**Check**:
1. Verify database connection string in environment
2. Test connection: `psql -h <host> -U <user> -d <database>`
3. Check if `SessionLocal` is configured in `app/db/session.py`

#### Issue C: Session Token Lookup Fails
**Symptoms**: Insert happens but `candidate_id` is NULL
**Causes**:
- `x_session_id` header not provided by frontend
- Session doesn't exist in `usersession` table
- User not logged in

**Check**:
```sql
-- Check if sessions exist
SELECT * FROM usersession WHERE session_token = '<your_session_token>';

-- Check user_cv_upload entries
SELECT id, session_id, candidate_id, filename, created_at 
FROM user_cv_upload 
ORDER BY created_at DESC 
LIMIT 10;
```

**If `candidate_id` is NULL**, this means:
- The session token wasn't provided OR
- The session doesn't exist in `usersession` table OR
- The user_id lookup failed

---

### Step 2: Check if Other Tables Are Being Populated

These tables are populated by **different API endpoints**:

**For `userjourney`**:
```bash
# Check if journey exists for your user
SELECT * FROM userjourney WHERE user_id = '<user_uuid>';
```

If no journey exists, the frontend needs to call:
- `POST /api/create-candidate-journey` (after payment)
- OR `POST /api/advance-journey` (to create/update journey)

**For `useranalysis`**:
```bash
# Check if analysis exists
SELECT * FROM useranalysis WHERE candidate_id = '<user_uuid>';
```

If no analysis exists, the frontend needs to call:
- `POST /api/create-candidate-analysis` (after selecting a target role)

**For `usercompletedgaps`**:
```bash
# Check if completed gaps exist
SELECT * FROM usercompletedgaps WHERE user_id = '<user_uuid>';
```

If no gaps exist, the user hasn't marked anything as completed yet.

---

## Common Scenarios and Solutions

### Scenario 1: CV Upload Works, But No Database Entry
**Diagnosis**: Background task is failing

**Solution**:
1. Add more logging to `_persist_cv_upload`:
```python
def _persist_cv_upload(...):
    logger.info("[_persist_cv_upload] START - session=%s, candidate_id=%s", 
                session_id, candidate_id)
    try:
        with SessionLocal() as db:
            logger.info("[_persist_cv_upload] Database session created")
            db.execute(...)
            logger.info("[_persist_cv_upload] Execute successful")
            db.commit()
            logger.info("[_persist_cv_upload] Commit successful")
    except Exception as exc:
        logger.error("[_persist_cv_upload] ERROR: %s", exc, exc_info=True)
```

2. Check if database connection works:
```python
# Test file: backend/test_db_connection.py
from app.db.session import SessionLocal
from sqlalchemy import text

with SessionLocal() as db:
    result = db.execute(text("SELECT 1")).fetchone()
    print(f"Database connection OK: {result}")
```

---

### Scenario 2: `user_cv_upload` Has Entries, But Others Don't
**Diagnosis**: Normal - those tables are populated by other endpoints

**Solution**: Check if frontend is calling the required endpoints:

1. **After CV upload**, frontend should call:
   - `/api/advance-journey` with `stage: "ANALYZE_CV"`

2. **After role selection**, frontend should call:
   - `/api/create-candidate-analysis` with target role details

3. **When user marks items complete**, frontend should call:
   - `POST /api/completed-gaps` with completed item details

---

### Scenario 3: All Tables Empty
**Diagnosis**: Either backend not running, or database schema not created

**Solution**:
1. Check if tables exist:
```sql
\dt public.*
```

2. If tables don't exist, run migrations:
```bash
cd backend
python -m app.core.async_db  # This runs schema creation
```

3. Or manually run SQL files:
```bash
psql -h <host> -U <user> -d <database> -f app/db/migrations/create_user_cv_upload_table.sql
```

---

## Quick Verification Commands

### Check if user_cv_upload is working:
```sql
-- Check recent uploads
SELECT id, session_id, candidate_id, filename, 
       jsonb_array_length(work_experience->'entries') as num_entries,
       created_at
FROM user_cv_upload
ORDER BY created_at DESC
LIMIT 5;
```

### Check if entries array is populated:
```sql
-- Check work experience entries structure
SELECT 
    filename,
    work_experience->>'formatted_text' as formatted_text,
    jsonb_pretty(work_experience->'entries') as entries
FROM user_cv_upload
ORDER BY created_at DESC
LIMIT 1;
```

### Check if candidate_id is being set:
```sql
-- Count uploads by candidate_id status
SELECT 
    CASE WHEN candidate_id IS NULL THEN 'NULL' ELSE 'SET' END as candidate_id_status,
    COUNT(*) as count
FROM user_cv_upload
GROUP BY candidate_id_status;
```

---

## Expected Behavior After This Session's Changes

After the work experience extractor implementation:

1. **`user_cv_upload.work_experience`** should now contain:
```json
{
  "formatted_text": "...",  // Legacy formatted text
  "entries": [               // NEW structured entries
    {
      "raw_block": "Senior Engineer\nTech Corp\nJan 2020 - Present\n• Led team...",
      "date_line": "Jan 2020 - Present",
      "start_date": "2020-01-01T00:00:00",
      "end_date": "2026-07-17T22:00:00"
    }
  ]
}
```

2. **Bare 2-digit years** like "Jul 25 - Present" should now be recognized

3. **No-space headings** like "PROFESSIONALEXPERIENCE" should now be detected

---

## Troubleshooting Checklist

- [ ] Backend server is running and accessible
- [ ] Database is accessible from backend
- [ ] `/uploadresume` endpoint returns success (200 OK)
- [ ] Log shows: `"[uploadresume] user_cv_upload persisted — session=..."`
- [ ] Database has `user_cv_upload` table with all columns
- [ ] `SessionLocal` is properly configured
- [ ] `x-session-id` header is provided by frontend
- [ ] Session exists in `usersession` table
- [ ] User exists in `users` table
- [ ] Background tasks are completing (not being killed on server restart)

---

## Next Steps

1. **Enable debug logging** in `resume_upload.py`
2. **Check application logs** for the persistence messages
3. **Query database** to see if any entries exist
4. **Verify frontend** is calling all required endpoints (not just /uploadresume)
5. **Check session management** - is x-session-id being passed correctly?

If entries are still not appearing, provide:
- Application logs from a CV upload request
- Database query results from the verification commands above
- Frontend network tab showing the API calls being made
