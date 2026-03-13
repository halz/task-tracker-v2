// src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { client } from "@/db";
import { nanoid } from "nanoid";

// GET: Fetch task with actions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Get task
    const taskResult = await client.execute({
      sql: "SELECT * FROM tasks WHERE id = ?",
      args: [id],
    });

    if (taskResult.rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const task = taskResult.rows[0];

    // Get actions - IMPORTANT: return content field
    const actionsResult = await client.execute({
      sql: "SELECT id, task_id, type, content, created_at FROM task_actions WHERE task_id = ? ORDER BY created_at DESC",
      args: [id],
    });

    const actions = actionsResult.rows.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      type: row.type,
      content: row.content, // Use content, not summary
      createdAt: row.created_at,
    }));

    // Get source email if exists
    let sourceEmail = null;
    if (task.source_id) {
      const emailResult = await client.execute({
        sql: "SELECT * FROM emails WHERE id = ?",
        args: [task.source_id],
      });
      if (emailResult.rows.length > 0) {
        const e = emailResult.rows[0];
        sourceEmail = {
          id: e.id,
          subject: e.subject,
          senderName: e.sender_name,
          senderEmail: e.sender_email,
          recipients: e.recipients,
          body: e.body,
          timestamp: e.timestamp,
        };
      }
    }

    return NextResponse.json({
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        source: task.source,
        sourceId: task.source_id,
        counterparty: task.counterparty,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
      },
      actions,
      sourceEmail,
    });
  } catch (error) {
    console.error("Failed to fetch task:", error);
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 });
  }
}

// PATCH: Update task fields (status/title)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { status, title } = body as { status?: string; title?: string };

    if (!status && typeof title !== "string") {
      return NextResponse.json({ error: "status or title is required" }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (typeof title === "string") {
      const normalizedTitle = title.trim();
      if (!normalizedTitle) {
        return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
      }

      await client.execute({
        sql: "UPDATE tasks SET title = ?, updated_at = ? WHERE id = ?",
        args: [normalizedTitle, now, id],
      });
    }

    if (status) {
      const allowedStatuses = new Set([
        "new",
        "draft_ready",
        "action_pending",
        "waiting",
        "waiting_reply",
        "in_progress",
        "on_hold",
        "no_action",
        "completed",
        "projectized",
        "archived",
      ]);

      if (!allowedStatuses.has(status)) {
        return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
      }

      // Update task status
      await client.execute({
        sql: "UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?",
        args: [status, now, id],
      });

      // Add action to history
      const actionId = nanoid();
      const statusLabels: Record<string, string> = {
        new: "New",
        draft_ready: "Draft Ready",
        action_pending: "Pending",
        waiting: "Waiting",
        waiting_reply: "Waiting Reply",
        in_progress: "In Progress",
        on_hold: "On Hold",
        no_action: "No Action Required",
        completed: "Completed",
        projectized: "Projectized",
        archived: "Archived",
      };

      await client.execute({
        sql: "INSERT INTO task_actions (id, task_id, type, content, created_at) VALUES (?, ?, 'status_change', ?, ?)",
        args: [actionId, id, `Status changed to: ${statusLabels[status] || status}`, now],
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update task:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
