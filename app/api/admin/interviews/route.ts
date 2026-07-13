import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabaseServer";
import { listInterviews, createInterview, createAgentFromInterview } from "@/lib/interviews";

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const interviews = await listInterviews();
  return NextResponse.json({ interviews });
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    interviewee_name,
    phone,
    email,
    scheduled_at,
    owner,
    showed,
    hired,
    enrollment_status,
    notes,
    source,
    calendly_event_uri,
  } = body;

  if (!interviewee_name || !scheduled_at || !owner) {
    return NextResponse.json(
      { error: "interviewee_name, scheduled_at, and owner are required" },
      { status: 400 }
    );
  }

  const interview = await createInterview({
    interviewee_name,
    phone: phone || null,
    email: email || null,
    scheduled_at,
    owner,
    showed: showed ?? null,
    hired: hired ?? null,
    enrollment_status: enrollment_status ?? null,
    notes: notes || null,
    source: source || "manual",
    calendly_event_uri: calendly_event_uri || null,
  });

  // Auto-create agent if applicable
  if (
    interview.linked_agent_id === null &&
    (enrollment_status === "enrolled" || (enrollment_status === "licensed" && hired === true))
  ) {
    try {
      await createAgentFromInterview(interview.id, enrollment_status);
    } catch {
      // non-fatal
    }
  }

  return NextResponse.json({ interview });
}
