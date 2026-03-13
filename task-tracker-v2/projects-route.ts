// src/app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { client } from "@/db";
import { nanoid } from "nanoid";

// GET: list projects
export async function GET() {
  try {
    const result = await client.execute({
      sql: `
        SELECT id, name, deadline, status, origin_task_id, created_at, updated_at
        FROM projects
        ORDER BY created_at DESC
      `,
      args: [],
    });

    const projects = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      deadline: row.deadline,
      status: row.status,
      originTaskId: row.origin_task_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

// POST: create project (optional task promotion)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, deadline, originTaskId } = body as {
      name?: string;
      deadline?: string | null;
      originTaskId?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    const id = nanoid();
    const now = new Date().toISOString();

    await client.execute({
      sql: `
        INSERT INTO projects (id, name, deadline, status, origin_task_id, created_at, updated_at)
        VALUES (?, ?, ?, 'active', ?, ?, ?)
      `,
      args: [id, name.trim(), deadline || null, originTaskId || null, now, now],
    });

    // If this is a promotion from an existing task:
    // 1) mark task as projectized (hidden from normal list)
    // 2) attach it to the new project
    if (originTaskId) {
      await client.execute({
        sql: `
          UPDATE tasks
          SET status = 'projectized', project_id = ?, updated_at = ?
          WHERE id = ?
        `,
        args: [id, now, originTaskId],
      });
    }

    return NextResponse.json({
      id,
      name: name.trim(),
      deadline: deadline || null,
      status: "active",
      originTaskId: originTaskId || null,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    console.error("Failed to create project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
