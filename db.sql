-- 1. Create user
CREATE USER admin WITH PASSWORD 'admin';

-- Optional: give superuser (FULL admin control)
ALTER USER admin WITH SUPERUSER;

-- If you DO NOT want superuser, comment above and use below granular grants instead


-- 2. Grant access to database (replace 'your_db' with actual DB name)
GRANT ALL PRIVILEGES ON DATABASE elevaite TO admin;



GRANT ALL ON SCHEMA public TO admin;


-- 5. Grant privileges on all existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;


-- 6. Grant privileges on all sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin;


-- 7. Grant privileges on all functions
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO admin;


-- 8. Grant privileges on all materialized views (important for your earlier error)
GRANT ALL PRIVILEGES ON ALL MATERIALIZED VIEWS IN SCHEMA public TO admin;


-- 9. Set default privileges for future objects

-- Tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON TABLES TO admin;

-- Sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON SEQUENCES TO admin;

-- Functions
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON FUNCTIONS TO admin;

-- Materialized Views (Postgres doesn't support default directly, workaround via owner)


-- 10. Optional: allow role creation & DB creation (if not superuser)
ALTER USER admin CREATEDB CREATEROLE;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    career_aspirations TEXT,
    selected_tier TEXT NOT NULL,
    last_payment_date DATE,
    created_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usersession (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    created_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id)
    REFERENCES candidates(id) ON DELETE CASCADE
);

CREATE INDEX idx_candidates_email ON candidates(email);
CREATE INDEX idx_session_user_id ON usersession(user_id);
CREATE INDEX idx_session_token ON usersession(session_token);

CREATE TABLE IF NOT EXISTS userjourney (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    current_stage VARCHAR(50) NOT NULL DEFAULT 'UPLOAD_CV',
    credits_remaining INT NOT NULL DEFAULT 1,
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
    updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
    CONSTRAINT userjourney_user_id_unique UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS stage_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
    session_token TEXT,
    extraction_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
    result JSONB,
    error_message TEXT,
    created_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stage_results_candidate ON stage_results(candidate_id);
CREATE INDEX idx_stage_results_type ON stage_results(extraction_type);
CREATE INDEX idx_stage_results_session ON stage_results(session_token);
