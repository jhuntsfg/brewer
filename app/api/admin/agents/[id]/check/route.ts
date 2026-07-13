import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabaseServer";
import { setCheck } from "@/lib/data";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { stepId, checked } = await request.json();
  if (!stepId || typeof checked !== "boolean") {
    return NextResponse.json({ error: "stepId and checked are required" }, { status: 400 });
  }

  await setCheck(id, stepId, checked, "admin");
  return NextResponse.json({ ok: true });
}
