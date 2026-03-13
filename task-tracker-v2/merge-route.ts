// src/app/api/tasks/merge/route.ts
import { NextRequest, NextResponse } from "next/server";
import { client } from "@/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetTaskId, sourceTaskId } = body;

    if (!targetTaskId || !sourceTaskId) {
      return NextResponse.json({ error: "Both targetTaskId and sourceTaskId are required" }, { status: 400 });
    }

    if (targetTaskId === sourceTaskId) {
      return NextResponse.json({ error: "Cannot merge a task into itself" }, { status: 400 });
    }

    // Verify both tasks exist
    const targetTask = await client.execute({
      sql: "SELECT id, title FROM tasks WHERE id = ?",
      args: [targetTaskId],
    });
    const sourceTask = await client.execute({
      sql: "SELECT id, title FROM tasks WHERE id = ?",
      args: [sourceTaskId],
    });

    if (targetTask.rows.length === 0) {
      return NextResponse.json({ error: "Target task not found" }, { status: 404 });
    }
    if (sourceTask.rows.length === 0) {
      return NextResponse.json({ error: "Source task not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    // 1. Move all actions from source task to target task
    await client.execute({
      sql: "UPDATE task_actions SET task_id = ? WHERE task_id = ?",
      args: [targetTaskId, sourceTaskId],
    });

    // 2. Add merge action to history
    const actionId = crypto.randomUUID().replace(/-/g, '');
    await client.execute({
      sql: `INSERT INTO task_actions (id, task_id, type, content, created_at) VALUES (?, ?, 'task_merged', ?, ?)`,
      args: [actionId, targetTaskId, `Merged from task: ${sourceTask.rows[0].title}`, now],
    });

    // 3. Update any emails pointing to source task (if task_id column exists in emails)
    try {
      await client.execute({
        sql: "UPDATE emails SET task_id = ? WHERE task_id = ?",
        args: [targetTaskId, sourceTaskId],
      });
    } catch (e) {
      // Ignore if column doesn't exist
    }

    // 4. Delete source task
    await client.execute({
      sql: "DELETE FROM tasks WHERE id = ?",
      args: [sourceTaskId],
    });

    // 5. Update target task timestamp
    await client.execute({
      sql: "UPDATE tasks SET updated_at = ? WHERE id = ?",
      args: [now, targetTaskId],
    });

    return NextResponse.json({
      success: true,
      message: "Tasks merged successfully",
      targetTaskId,
      sourceTaskId,
      targetTitle: targetTask.rows[0].title,
      sourceTitle: sourceTask.rows[0].title,
    });

  } catch (error) {
    console.error("Merge error:", error);
    return NextResponse.json({ error: "Failed to merge tasks" }, { status: 500 });
  }
}
