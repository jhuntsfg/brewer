import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabaseServer";
import { setContractsSent } from "@/lib/data";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { sent } = await request.json();
  if (typeof sent !== "boolean") {
    return NextResponse.json({ error: "sent is required" }, { status: 400 });
  }

  await setContractsSent(id, sent);
  return NextResponse.json({ ok: true });
}
