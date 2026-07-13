import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabaseServer";
import { setExamDate } from "@/lib/data";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { examDate } = await request.json();

  await setExamDate(id, examDate || null);
  return NextResponse.json({ ok: true });
}
