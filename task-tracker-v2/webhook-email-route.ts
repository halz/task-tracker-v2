// src/app/api/webhook/email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { client } from "@/db";

// Webhook secret for verification (set in Vercel env)
const WEBHOOK_SECRET = process.env.EMAIL_WEBHOOK_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    // Optional: Verify webhook secret
    const authHeader = request.headers.get("x-webhook-secret");
    if (WEBHOOK_SECRET && authHeader !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Power Automate sends email data in this format
    const {
      subject,
      from,           // sender email
      fromName,       // sender display name  
      to,             // recipients
      cc,
      receivedDateTime,
      bodyPreview,    // short preview
      body: emailBody,// full body (if included)
      messageId,      // unique message ID
      conversationId, // thread ID
      folder,         // folder path
      mailbox,        // which mailbox (yoshi/it-support)
    } = body;

    if (!messageId || !subject) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check for duplicate
    const existing = await client.execute({
      sql: "SELECT id FROM emails WHERE message_id = ?",
      args: [messageId],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json({ 
        status: "duplicate", 
        emailId: existing.rows[0].id,
        message: "Email already exists" 
      });
    }

    // Generate UUID for new email
    const emailId = crypto.randomUUID().replace(/-/g, '');
    const now = new Date().toISOString();

    // Insert email
    await client.execute({
      sql: `
        INSERT INTO emails (
          id, subject, sender_email, sender_name, recipients, cc_recipients,
          message_id, thread_id, timestamp, iso_timestamp, body, 
          mailbox, folder, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        emailId,
        subject,
        from || "",
        fromName || "",
        to || "",
        cc || "",
        messageId,
        conversationId || messageId,
        receivedDateTime || now,
        receivedDateTime || now,
        emailBody || bodyPreview || "",
        mailbox || "yoshi",
        folder || "Inbox",
        now,
      ],
    });

    // Return success with email ID for task creation
    return NextResponse.json({
      status: "created",
      emailId,
      subject,
      from,
      fromName,
      folder,
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET for testing
export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    message: "Email webhook endpoint ready",
    usage: "POST with email data from Power Automate"
  });
}
