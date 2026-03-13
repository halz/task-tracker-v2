-- A) True duplicate tasks linked to same email row (source_id duplication)
SELECT t.source_id, COUNT(*) AS task_count,
       MIN(t.created_at) AS first_created,
       MAX(t.created_at) AS last_created
FROM tasks t
WHERE t.source = 'email' AND t.source_id IS NOT NULL
GROUP BY t.source_id
HAVING COUNT(*) > 1
ORDER BY task_count DESC, last_created DESC;

-- B) Same Outlook message_id producing multiple tasks
SELECT e.message_id, COUNT(*) AS task_count,
       MIN(t.created_at) AS first_created,
       MAX(t.created_at) AS last_created
FROM tasks t
JOIN emails e ON e.id = t.source_id
GROUP BY e.message_id
HAVING COUNT(*) > 1
ORDER BY task_count DESC, last_created DESC;

-- C) Same thread_id producing many tasks (likely 'pseudo-duplicate' / split-thread issue)
SELECT e.thread_id, COUNT(*) AS task_count,
       MIN(t.created_at) AS first_created,
       MAX(t.created_at) AS last_created
FROM tasks t
JOIN emails e ON e.id = t.source_id
WHERE e.thread_id IS NOT NULL AND e.thread_id <> ''
GROUP BY e.thread_id
HAVING COUNT(*) > 1
ORDER BY task_count DESC, last_created DESC;

-- D) Inspect top suspicious task groups (thread + title)
SELECT e.thread_id, t.title, COUNT(*) AS cnt,
       GROUP_CONCAT(t.id, ',') AS task_ids
FROM tasks t
JOIN emails e ON e.id = t.source_id
WHERE e.thread_id IS NOT NULL AND e.thread_id <> ''
GROUP BY e.thread_id, t.title
HAVING COUNT(*) > 1
ORDER BY cnt DESC
LIMIT 100;
