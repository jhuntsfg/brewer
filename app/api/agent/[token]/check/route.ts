import { NextRequest, NextResponse } from "next/server";
import { getAgentFullByToken, setCheck } from "@/lib/data";

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const full = await getAgentFullByToken(token);
  if (!full) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { stepId, checked } = await request.json();
  if (!stepId || typeof checked !== "boolean") {
    return NextResponse.json({ error: "stepId and checked are required" }, { status: 400 });
  }

  const existing = full.checks[stepId];
  if (existing?.checked && existing.checked_by === "admin" && !checked) {
    return NextResponse.json(
      { error: "This step was marked complete by the admin and can't be unchecked here." },
      { status: 403 }
    );
  }

  await setCheck(full.agent.id, stepId, checked, "agent");
  return NextResponse.json({ ok: true });
}
