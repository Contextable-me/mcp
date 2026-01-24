-- Contextable MCP Server - Initial Schema
-- SQLite with FTS5 full-text search
--
-- Tables: projects, artifacts, artifact_versions, artifacts_fts

-- =============================================================================
-- PROJECTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE (name COLLATE NOCASE)
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name COLLATE NOCASE);

-- =============================================================================
-- ARTIFACTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('document', 'code', 'decision', 'conversation', 'file')),
  content TEXT NOT NULL,
  summary TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('core', 'normal', 'reference')),
  tags TEXT DEFAULT '[]',
  version INTEGER DEFAULT 1,
  archived_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE (project_id, title COLLATE NOCASE)
);

CREATE INDEX IF NOT EXISTS idx_artifacts_project ON artifacts(project_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_artifacts_priority ON artifacts(priority);
CREATE INDEX IF NOT EXISTS idx_artifacts_archived ON artifacts(archived_at);

-- =============================================================================
-- ARTIFACT VERSIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS artifact_versions (
  id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  priority TEXT,
  change_source TEXT DEFAULT 'update' CHECK (change_source IN ('update', 'archive', 'restore', 'rollback')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_versions_artifact ON artifact_versions(artifact_id, version DESC);

-- =============================================================================
-- FULL-TEXT SEARCH
-- =============================================================================

CREATE VIRTUAL TABLE IF NOT EXISTS artifacts_fts USING fts5(
  title,
  content,
  summary,
  content='artifacts',
  content_rowid='rowid'
);

-- Triggers to keep FTS index in sync with artifacts table

-- After INSERT: add to FTS
CREATE TRIGGER IF NOT EXISTS artifacts_ai AFTER INSERT ON artifacts BEGIN
  INSERT INTO artifacts_fts(rowid, title, content, summary)
  VALUES (NEW.rowid, NEW.title, NEW.content, NEW.summary);
END;

-- After DELETE: remove from FTS
CREATE TRIGGER IF NOT EXISTS artifacts_ad AFTER DELETE ON artifacts BEGIN
  INSERT INTO artifacts_fts(artifacts_fts, rowid, title, content, summary)
  VALUES ('delete', OLD.rowid, OLD.title, OLD.content, OLD.summary);
END;

-- After UPDATE: update FTS (delete old, insert new)
CREATE TRIGGER IF NOT EXISTS artifacts_au AFTER UPDATE ON artifacts BEGIN
  INSERT INTO artifacts_fts(artifacts_fts, rowid, title, content, summary)
  VALUES ('delete', OLD.rowid, OLD.title, OLD.content, OLD.summary);
  INSERT INTO artifacts_fts(rowid, title, content, summary)
  VALUES (NEW.rowid, NEW.title, NEW.content, NEW.summary);
END;

-- =============================================================================
-- SCHEMA VERSION
-- =============================================================================

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO schema_version (version) VALUES (1);
