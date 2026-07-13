import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAgentFullById } from "@/lib/data";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const full = await getAgentFullById(id);
  if (!full) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(full);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const allowed = ["name", "upline", "start_date", "type", "phone", "email", "state", "notes", "stall_snoozed_until"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      // notes can be empty string (clear notes); other fields treat empty as null
      update[key] = key === "notes" ? (body[key] ?? null) : (body[key] || null);
    }
  }
  if (update.name === null) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const { error } = await supabaseAdmin.from("agents").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { error } = await supabaseAdmin.from("agents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
