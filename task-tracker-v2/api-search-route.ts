// src/app/api/tasks/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { client } from "@/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q")?.trim() || "";
  const status = searchParams.get("status") || "";
  const priority = searchParams.get("priority") || "";

  if (!q && !status && !priority) {
    return NextResponse.json({ tasks: [] });
  }

  try {
    let sql = `
      SELECT * FROM tasks 
      WHERE 1=1
    `;
    const params: string[] = [];

    // Full-text search on title and counterparty
    if (q) {
      sql += ` AND (title LIKE ? OR counterparty LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }

    // Filter by status
    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    // Filter by priority
    if (priority) {
      sql += ` AND priority = ?`;
      params.push(priority);
    }

    sql += ` ORDER BY created_at DESC LIMIT 50`;

    const result = await client.execute({ sql, args: params });

    const tasks = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      priority: row.priority,
      source: row.source,
      sourceId: row.source_id,
      counterparty: row.counterparty,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ tasks, count: tasks.length });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
