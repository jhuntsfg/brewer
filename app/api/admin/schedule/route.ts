import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabaseServer";
import { listAllSchedules } from "@/lib/schedules";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [schedules, agentsRes] = await Promise.all([
    listAllSchedules(),
    supabaseAdmin.from("agents").select("id, name").order("name"),
  ]);

  return NextResponse.json({ schedules, agents: agentsRes.data ?? [] });
}
