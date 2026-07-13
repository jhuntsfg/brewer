import { NextRequest, NextResponse } from "next/server";
import { getAgentFullByToken, setExamDate } from "@/lib/data";

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const full = await getAgentFullByToken(token);
  if (!full) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { examDate } = await request.json();
  await setExamDate(full.agent.id, examDate || null);
  return NextResponse.json({ ok: true });
}
