import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getInterviewerEmail } from "@/lib/interviewers";

export const runtime = "nodejs";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }) + " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}

export async function GET(request: NextRequest) {
  // Verify this is a legitimate Vercel cron request
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }

  // Find interviews that:
  // - scheduled_at was 15+ minutes ago
  // - showed is still null (not filled out)
  // - not canceled
  // - haven't had a reminder sent yet
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { data: interviews, error } = await supabaseAdmin
    .from("interviews")
    .select("id, interviewee_name, scheduled_at, owner")
    .is("showed", null)
    .is("canceled_at", null)
    .lte("scheduled_at", fifteenMinutesAgo);

  if (error) {
    console.error("Cron: failed to fetch interviews", error);
    return Response.json({ error: String(error) }, { status: 500 });
  }

  if (!interviews || interviews.length === 0) {
    return Response.json({ sent: 0 });
  }

  // Filter out interviews that already have a reminder sent
  const { data: alreadySent } = await supabaseAdmin
    .from("interview_emails")
    .select("interview_id")
    .in("interview_id", interviews.map((i) => i.id));

  const sentIds = new Set((alreadySent ?? []).map((r) => r.interview_id));
  const pending = interviews.filter((i) => !sentIds.has(i.id));

  let sent = 0;
  for (const interview of pending) {
    const toEmail = await getInterviewerEmail(interview.owner);
    if (!toEmail) {
      console.log(`Cron: no email found for owner "${interview.owner}", skipping`);
      continue;
    }

    const subject = `Follow-up needed: ${interview.interviewee_name}`;
    const html = `
      <p>Hi ${interview.owner},</p>
      <p>Your interview with <strong>${interview.interviewee_name}</strong> was scheduled for <strong>${formatDateTime(interview.scheduled_at)}</strong>.</p>
      <p>Please log in and update the record — did they show? Were they hired?</p>
      <p><a href="https://agent-onboarding-tracker.vercel.app/dashboard/interviews" style="background:#637777;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:8px;">Update Interview</a></p>
      <p style="color:#999;font-size:12px;margin-top:24px;">Hunt Agency Interview Tracker</p>
    `;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Hunt Agency <onboarding@resend.dev>",
          to: [toEmail],
          subject,
          html,
        }),
      });

      if (res.ok) {
        await supabaseAdmin.from("interview_emails").insert({
          interview_id: interview.id,
          sent_to: toEmail,
          subject,
        });
        sent++;
        console.log(`Cron: sent reminder for ${interview.interviewee_name} to ${toEmail}`);
      } else {
        const err = await res.text();
        console.error(`Cron: Resend error for ${interview.interviewee_name}:`, err);
      }
    } catch (err) {
      console.error(`Cron: failed to send for ${interview.interviewee_name}:`, err);
    }
  }

  return Response.json({ sent, pending: pending.length });
}
