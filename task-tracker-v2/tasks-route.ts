// src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { client } from "@/db";
import { nanoid } from "nanoid";

// GET: List tasks with optional filters
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");

  try {
    let sql = "SELECT * FROM tasks WHERE 1=1";
    const params: string[] = [];

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    } else {
      // Default list should hide projectized tasks from normal task list
      sql += " AND status != 'projectized'";
    }

    if (priority) {
      sql += " AND priority = ?";
      params.push(priority);
    }

    sql += " ORDER BY created_at DESC";

    const result = await client.execute({ sql, args: params });

    const tasks = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      source: row.source,
      sourceId: row.source_id,
      counterparty: row.counterparty,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

// POST: Create a new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, priority, source, sourceId, counterparty } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const id = nanoid();
    const now = new Date().toISOString();

    // Insert the task
    await client.execute({
      sql: `
        INSERT INTO tasks (id, title, description, status, priority, source, source_id, counterparty, created_at, updated_at)
        VALUES (?, ?, ?, 'new', ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        title,
        description || null,
        priority || "medium",
        source || null,
        sourceId || null,
        counterparty || null,
        now,
        now,
      ],
    });

    // Auto-add source email to task history if sourceId exists
    if (sourceId) {
      const actionId = nanoid();
      await client.execute({
        sql: `
          INSERT INTO task_actions (id, task_id, type, content, created_at)
          VALUES (?, ?, 'email_received', ?, ?)
        `,
        args: [actionId, id, `Source email linked (ID: ${sourceId})`, now],
      });
    }

    return NextResponse.json({
      id,
      title,
      description,
      status: "new",
      priority: priority || "medium",
      source,
      sourceId,
      counterparty,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    console.error("Failed to create task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
