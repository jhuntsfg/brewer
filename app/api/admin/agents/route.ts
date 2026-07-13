import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabaseServer";
import { createAgent, listAgentsFull } from "@/lib/data";

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agents = await listAgentsFull();
  return NextResponse.json({ agents });
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, upline, start_date, type, phone, email, state } = body;
  if (!name || !type) {
    return NextResponse.json({ error: "name and type are required" }, { status: 400 });
  }

  const agent = await createAgent({
    name,
    upline: upline || null,
    start_date: start_date || new Date().toISOString().slice(0, 10),
    type,
    phone: phone || null,
    email: email || null,
    state: state || null,
  });

  return NextResponse.json({ agent });
}
