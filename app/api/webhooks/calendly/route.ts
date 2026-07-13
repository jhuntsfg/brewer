import { NextRequest } from "next/server";
import { createInterview, updateInterview, listInterviews } from "@/lib/interviews";
import { createHmac, timingSafeEqual } from "crypto";

export const runtime = "nodejs";

function verifySignature(payload: string, signature: string | null): boolean {
  const secret = process.env.CALENDLY_WEBHOOK_SECRET;
  // If no secret configured, skip verification
  if (!secret) return true;
  if (!signature) return false;
  try {
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return false;
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

export async function GET() {
  // Debug endpoint — verify route is reachable and DB is working
  try {
    const rows = await listInterviews();
    return Response.json({ ok: true, count: rows.length });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-calendly-webhook-signature");

  if (!verifySignature(rawBody, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const event = payload.event as string;
  const data = payload.payload as Record<string, unknown>;

  console.log("Calendly webhook event:", event, "top-level payload keys:", Object.keys(data ?? {}));

  if (event === "invitee.created") {
    try {
      // Calendly v2: invitee fields are nested under data.invitee
      const invitee = (data?.invitee as Record<string, unknown>) ?? data;
      const name = (invitee?.name as string) ?? (data?.name as string) ?? "Unknown";
      const email = (invitee?.email as string) ?? (data?.email as string) ?? null;

      const scheduledEvent = data.scheduled_event as Record<string, unknown>;
      const calendly_event_uri = (scheduledEvent?.uri as string) ?? null;
      const scheduled_at = (scheduledEvent?.start_time as string) ?? new Date().toISOString();

      console.log("Calendly invitee.created: name=", name, "email=", email, "uri=", calendly_event_uri, "scheduled_at=", scheduled_at);

      // Phone comes from text_reminder_number on the invitee payload
      const phone = (data?.text_reminder_number as string) ?? null;

      // State from questions_and_answers
      let state: string | null = null;
      const qas = (invitee?.questions_and_answers ?? data?.questions_and_answers) as Array<Record<string, string>> | undefined;
      if (Array.isArray(qas)) {
        for (const qa of qas) {
          const q = (qa.question ?? "").toLowerCase();
          if (q.includes("state") || q.includes("reside") || q.includes("located")) {
            state = qa.answer ?? null;
            break;
          }
        }
      }

      // Get owner from event memberships
      const memberships = scheduledEvent?.event_memberships as Array<Record<string, string>> | undefined;
      const owner = (Array.isArray(memberships) && memberships[0]?.user_name) ? memberships[0].user_name : "";

      // Skip if this event URI already exists
      if (calendly_event_uri) {
        const existing = await listInterviews();
        const dup = existing.find((i) => i.calendly_event_uri === calendly_event_uri);
        if (dup) {
          console.log("Calendly: duplicate event URI, skipping", calendly_event_uri);
          return new Response("OK", { status: 200 });
        }
      }

      await createInterview({
        interviewee_name: name,
        email,
        phone,
        scheduled_at,
        owner,
        source: "calendly",
        calendly_event_uri,
        state,
      });
      console.log("Calendly invitee.created: successfully created interview for", name);
    } catch (err) {
      console.error("Calendly invitee.created error:", err);
      return new Response("Internal error", { status: 500 });
    }
    return new Response("OK", { status: 200 });
  }

  if (event === "invitee.canceled") {
    try {
      const scheduledEvent = data.scheduled_event as Record<string, unknown>;
      const calendly_event_uri = (scheduledEvent?.uri as string) ?? null;

      if (calendly_event_uri) {
        const existing = await listInterviews();
        const row = existing.find((i) => i.calendly_event_uri === calendly_event_uri);
        if (row) {
          await updateInterview(row.id, { canceled_at: new Date().toISOString() });
        }
      }
    } catch (err) {
      console.error("Calendly invitee.canceled error:", err);
    }
    return new Response("OK", { status: 200 });
  }

  return new Response("Unrecognized event", { status: 400 });
}
