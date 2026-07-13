import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { listInterviewers } from "@/lib/interviewers";

export const runtime = "nodejs";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }

  // Find all past interviews where showed is still null
  const now = new Date().toISOString();
  const { data: pending } = await supabaseAdmin
    .from("interviews")
    .select("id, interviewee_name, scheduled_at, owner")
    .is("showed", null)
    .is("canceled_at", null)
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: false });

  if (!pending || pending.length === 0) {
    return Response.json({ sent: 0, message: "No pending interviews" });
  }

  // Group by owner
  const byOwner: Record<string, typeof pending> = {};
  for (const interview of pending) {
    const owner = interview.owner || "Unknown";
    if (!byOwner[owner]) byOwner[owner] = [];
    byOwner[owner].push(interview);
  }

  const interviewers = await listInterviewers();
  const emailMap = Object.fromEntries(interviewers.map((i) => [i.name, i.email]));

  let sent = 0;
  for (const [owner, interviews] of Object.entries(byOwner)) {
    const toEmail = emailMap[owner];
    if (!toEmail) {
      console.log(`Weekly digest: no email for "${owner}", skipping`);
      continue;
    }

    const rows = interviews.map((i) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-weight:500;color:#374151">${i.interviewee_name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#6b7280">${formatDate(i.scheduled_at)}</td>
      </tr>
    `).join("");

    const html = `
      <p>Hi ${owner},</p>
      <p>You have <strong>${interviews.length} interview${interviews.length === 1 ? "" : "s"}</strong> that still need to be updated:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:500">Interviewee</th>
            <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:500">Date</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p>Please log in and mark whether each person showed and whether they were hired.</p>
      <p><a href="https://agent-onboarding-tracker.vercel.app/dashboard/interviews" style="background:#637777;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:8px;">Update Interviews</a></p>
      <p style="color:#999;font-size:12px;margin-top:24px;">Hunt Agency Interview Tracker · Weekly reminder</p>
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
          subject: `${interviews.length} interview${interviews.length === 1 ? "" : "s"} need your follow-up`,
          html,
        }),
      });

      if (res.ok) {
        // Log each interview as having a weekly digest sent
        await supabaseAdmin.from("interview_emails").insert(
          interviews.map((i) => ({
            interview_id: i.id,
            sent_to: toEmail,
            subject: `Weekly digest — ${interviews.length} pending`,
          }))
        );
        sent++;
        console.log(`Weekly digest: sent to ${toEmail} (${interviews.length} interviews)`);
      } else {
        const err = await res.text();
        console.error(`Weekly digest: Resend error for ${owner}:`, err);
      }
    } catch (err) {
      console.error(`Weekly digest: failed for ${owner}:`, err);
    }
  }

  return Response.json({ sent });
}
