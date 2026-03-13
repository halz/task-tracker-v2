-- 1) Hard-stop future duplicates at DB layer
CREATE UNIQUE INDEX IF NOT EXISTS idx_emails_message_id_unique
ON emails(message_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_source_id_unique
ON tasks(source_id)
WHERE source = 'email' AND source_id IS NOT NULL;

-- 2) Repair existing duplicates (keep oldest task per source_id)
-- 2-1: move task_actions from duplicate tasks to keeper task
UPDATE task_actions
SET task_id = (
  SELECT t_keep.id
  FROM tasks t_keep
  WHERE t_keep.source_id = (
    SELECT t_dup.source_id FROM tasks t_dup WHERE t_dup.id = task_actions.task_id
  )
  ORDER BY t_keep.created_at ASC
  LIMIT 1
)
WHERE task_id IN (
  SELECT t.id
  FROM tasks t
  JOIN (
    SELECT source_id
    FROM tasks
    WHERE source = 'email' AND source_id IS NOT NULL
    GROUP BY source_id
    HAVING COUNT(*) > 1
  ) d ON d.source_id = t.source_id
)
AND task_id != (
  SELECT t_keep.id
  FROM tasks t_keep
  WHERE t_keep.source_id = (
    SELECT t_dup.source_id FROM tasks t_dup WHERE t_dup.id = task_actions.task_id
  )
  ORDER BY t_keep.created_at ASC
  LIMIT 1
);

-- 2-2: delete duplicate tasks (keep oldest)
DELETE FROM tasks
WHERE id IN (
  SELECT t.id
  FROM tasks t
  JOIN (
    SELECT source_id, MIN(created_at) AS keep_created_at
    FROM tasks
    WHERE source = 'email' AND source_id IS NOT NULL
    GROUP BY source_id
    HAVING COUNT(*) > 1
  ) d ON d.source_id = t.source_id
  WHERE t.created_at != d.keep_created_at
);
