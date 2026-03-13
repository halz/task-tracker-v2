-- v2.2.0 projectization schema

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  deadline TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  origin_task_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- tasks extension for project linkage
ALTER TABLE tasks ADD COLUMN project_id TEXT;
ALTER TABLE tasks ADD COLUMN deadline TEXT;
ALTER TABLE tasks ADD COLUMN start_date TEXT;

-- helpful index
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
