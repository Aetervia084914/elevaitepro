-- tool_master: stores unique tools/technologies discovered by the pipeline
CREATE TABLE IF NOT EXISTS tool_master (
    id              SERIAL PRIMARY KEY,
    canonical_name  VARCHAR(255) NOT NULL UNIQUE,
    category        VARCHAR(50)  NOT NULL,  -- programming_language, framework, tool, software, platform, cloud, database, technology
    description     TEXT,
    first_seen_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_seen_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    occurrence_count INTEGER     NOT NULL DEFAULT 1,
    source          VARCHAR(50)  NOT NULL DEFAULT 'llm_extraction'
);

CREATE INDEX IF NOT EXISTS idx_tool_master_canonical ON tool_master (canonical_name);
CREATE INDEX IF NOT EXISTS idx_tool_master_category  ON tool_master (category);

-- tool_alias: stores alternative names/aliases for each tool
CREATE TABLE IF NOT EXISTS tool_alias (
    id              SERIAL PRIMARY KEY,
    tool_master_id  INTEGER      NOT NULL REFERENCES tool_master(id) ON DELETE CASCADE,
    alias_name      VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (tool_master_id, alias_name)
);

CREATE INDEX IF NOT EXISTS idx_tool_alias_master  ON tool_alias (tool_master_id);
CREATE INDEX IF NOT EXISTS idx_tool_alias_name    ON tool_alias (alias_name);
