import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabaseServer";
import { listSchedulesForAgent, createSchedule, deleteSchedule, updateSchedule } from "@/lib/schedules";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const schedules = await listSchedulesForAgent(id);
  return NextResponse.json({ schedules });
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const schedule = await createSchedule({
    agent_id: id,
    day_of_week: body.day_of_week,
    start_time: body.start_time,
    end_time: body.end_time,
    label: body.label ?? null,
  });
  return NextResponse.json({ schedule }, { status: 201 });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await params;
  const body = await request.json();
  const { scheduleId, ...patch } = body;
  const schedule = await updateSchedule(scheduleId, patch);
  return NextResponse.json({ schedule });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await params;
  const body = await request.json();
  await deleteSchedule(body.scheduleId);
  return NextResponse.json({ ok: true });
}
