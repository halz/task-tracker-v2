// src/app/api/webhook/email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { client } from "@/db";

// Webhook secret for verification (set in Vercel env)
const WEBHOOK_SECRET = process.env.EMAIL_WEBHOOK_SECRET || "";

// Filter patterns - emails matching these should NOT be turned into tasks
const SKIP_TASK_PATTERNS = {
  senders: [
    /noreply/i,
    /no-reply/i,
    /donotreply/i,
    /notifications?@/i,
    /alert@/i,
    /mailer-daemon/i,
    /@taskalfa/i,
    /photoup/i,
    /franconnect/i,
    /telstra.*usage/i,
    /apple\.com/i,
    /microsoft\.com.*noreply/i,
    /teams.*notification/i,
  ],
  subjects: [
    /out of office/i,
    /automatic reply/i,
    /auto-reply/i,
    /undeliverable/i,
    /delivery.*failed/i,
    /read:?\s/i,
    /voicemail/i,
    /voice mail/i,
    /missed call/i,
    /sent \d+ messages? to your chat/i,  // Teams notifications
    /data usage/i,
    /password.*expir/i,
    /sign-?in.*notification/i,
    /security alert/i,
    /newsletter/i,
    /unsubscribe/i,
    /marketing/i,
    /promotional/i,
    /photoUP/i,
    /TASKalfa/i,
  ],
};

function shouldCreateTask(email: {
  from: string;
  fromName: string;
  subject: string;
  bodyPreview?: string;
}): { create: boolean; reason?: string } {
  // Check sender patterns
  for (const pattern of SKIP_TASK_PATTERNS.senders) {
    if (pattern.test(email.from) || pattern.test(email.fromName)) {
      return { create: false, reason: `Sender matches skip pattern: ${pattern}` };
    }
  }

  // Check subject patterns
  for (const pattern of SKIP_TASK_PATTERNS.subjects) {
    if (pattern.test(email.subject)) {
      return { create: false, reason: `Subject matches skip pattern: ${pattern}` };
    }
  }

  return { create: true };
}

export async function POST(request: NextRequest) {
  try {
    // Optional: Verify webhook secret
    const authHeader = request.headers.get("x-webhook-secret");
    if (WEBHOOK_SECRET && authHeader !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    const {
      subject,
      from,
      fromName,
      to,
      cc,
      receivedDateTime,
      bodyPreview,
      body: emailBody,
      messageId,
      conversationId,
      folder,
      mailbox,
    } = body;

    if (!messageId || !subject) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check for duplicate email
    const existingEmail = await client.execute({
      sql: "SELECT id FROM emails WHERE message_id = ?",
      args: [messageId],
    });

    let emailId: string;
    let emailStatus: "created" | "duplicate" = "created";

    if (existingEmail.rows.length > 0) {
      emailId = existingEmail.rows[0].id as string;
      emailStatus = "duplicate";
    } else {
      // Generate UUID for new email
      emailId = crypto.randomUUID().replace(/-/g, '');
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
          fromName || from || "",
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
    }

    // Check if task should be created
    const taskCheck = shouldCreateTask({
      from: from || "",
      fromName: fromName || "",
      subject: subject || "",
      bodyPreview: bodyPreview || "",
    });

    let taskId: string | null = null;
    let taskStatus: "created" | "skipped" | "exists" = "skipped";
    let taskReason = taskCheck.reason;

    if (taskCheck.create) {
      // Check if task already exists for this email
      const existingTask = await client.execute({
        sql: "SELECT id FROM tasks WHERE source_id = ?",
        args: [emailId],
      });

      if (existingTask.rows.length > 0) {
        taskId = existingTask.rows[0].id as string;
        taskStatus = "exists";
        taskReason = "Task already exists for this email";
      } else {
        // Create task
        taskId = crypto.randomUUID().replace(/-/g, '');
        const now = new Date().toISOString();
        
        // Extract clean sender name
        const senderName = fromName || from?.split('@')[0] || "Unknown";
        
        // Create English title from subject
        const taskTitle = subject.replace(/^(RE:|FW:|Fwd:)\s*/gi, '').trim();

        await client.execute({
          sql: `
            INSERT INTO tasks (id, title, status, priority, source, source_id, counterparty, created_at, updated_at)
            VALUES (?, ?, 'new', 'medium', 'email', ?, ?, ?, ?)
          `,
          args: [taskId, taskTitle, emailId, senderName, now, now],
        });

        // Add email_received action to task history
        const actionId = crypto.randomUUID().replace(/-/g, '');
        await client.execute({
          sql: `
            INSERT INTO task_actions (id, task_id, type, content, created_at)
            VALUES (?, ?, 'email_received', ?, ?)
          `,
          args: [actionId, taskId, `Email received from ${senderName}: ${subject}`, now],
        });

        taskStatus = "created";
        taskReason = "New task created";
      }
    }

    return NextResponse.json({
      email: {
        status: emailStatus,
        id: emailId,
        subject,
        from,
        folder,
      },
      task: {
        status: taskStatus,
        id: taskId,
        reason: taskReason,
      },
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
    message: "Email webhook endpoint ready (v2 with auto-task)",
    skipPatterns: {
      senders: SKIP_TASK_PATTERNS.senders.length,
      subjects: SKIP_TASK_PATTERNS.subjects.length,
    }
  });
}
