import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { listSchedulesForAgent, createSchedule, deleteSchedule, updateSchedule } from "@/lib/schedules";

async function getAgentByToken(token: string) {
  const { data } = await supabaseAdmin
    .from("agents")
    .select("id")
    .eq("unique_token", token)
    .maybeSingle();
  return data;
}

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { token } = await params;
  const agent = await getAgentByToken(token);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const schedules = await listSchedulesForAgent(agent.id);
  return NextResponse.json({ schedules });
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const { token } = await params;
  const agent = await getAgentByToken(token);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json();
  const schedule = await createSchedule({
    agent_id: agent.id,
    day_of_week: body.day_of_week,
    start_time: body.start_time,
    end_time: body.end_time,
    label: body.label ?? null,
  });
  return NextResponse.json({ schedule }, { status: 201 });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { token } = await params;
  const agent = await getAgentByToken(token);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json();
  const { scheduleId, ...patch } = body;
  const schedule = await updateSchedule(scheduleId, patch);
  return NextResponse.json({ schedule });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { token } = await params;
  const agent = await getAgentByToken(token);
  if (!agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json();
  await deleteSchedule(body.scheduleId);
  return NextResponse.json({ ok: true });
}
