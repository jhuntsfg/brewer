import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabaseServer";
import { listInterviewEmails } from "@/lib/interviews";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const emails = await listInterviewEmails(id);
  return NextResponse.json({ emails });
}
