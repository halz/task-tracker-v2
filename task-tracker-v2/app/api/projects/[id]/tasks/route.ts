// src/app/api/projects/[id]/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { client } from "@/db";

// POST: manually add existing task into a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  try {
    const body = await request.json();
    const { taskId } = body as { taskId?: string };

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    // validate project exists
    const projectResult = await client.execute({
      sql: "SELECT id FROM projects WHERE id = ?",
      args: [projectId],
    });

    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // validate task exists
    const taskResult = await client.execute({
      sql: "SELECT id FROM tasks WHERE id = ?",
      args: [taskId],
    });

    if (taskResult.rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    // manually link task to project
    await client.execute({
      sql: `
        UPDATE tasks
        SET project_id = ?, status = 'projectized', updated_at = ?
        WHERE id = ?
      `,
      args: [projectId, now, taskId],
    });

    return NextResponse.json({ success: true, projectId, taskId });
  } catch (error) {
    console.error("Failed to add task to project:", error);
    return NextResponse.json({ error: "Failed to add task to project" }, { status: 500 });
  }
}
