import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabaseServer";
import { getInterview, updateInterview, createAgentFromInterview, deleteInterview } from "@/lib/interviews";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const interview = await getInterview(id);
  if (!interview) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ interview });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const patch: Record<string, unknown> = {};
  if ("owner" in body) patch.owner = body.owner;
  if ("showed" in body) patch.showed = body.showed;
  if ("hired" in body) patch.hired = body.hired;
  if ("enrollment_status" in body) patch.enrollment_status = body.enrollment_status;
  if ("notes" in body) patch.notes = body.notes;
  if ("canceled_at" in body) patch.canceled_at = body.canceled_at;
  if ("state" in body) patch.state = body.state;

  const interview = await updateInterview(id, patch);

  // Auto-create agent if enrollment_status was just set and no agent is linked
  const es = interview.enrollment_status;
  if (
    interview.linked_agent_id === null &&
    (es === "enrolled" || (es === "licensed" && interview.hired === true))
  ) {
    try {
      await createAgentFromInterview(interview.id, es);
    } catch {
      // non-fatal
    }
  }

  return NextResponse.json({ interview });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteInterview(id);
  return NextResponse.json({ ok: true });
}
