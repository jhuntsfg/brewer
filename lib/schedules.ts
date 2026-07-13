import { supabaseAdmin } from "./supabaseAdmin";

export type AgentSchedule = {
  id: string;
  agent_id: string;
  day_of_week: number; // 0=Sun … 6=Sat
  start_time: string;  // "HH:MM:SS"
  end_time: string;
  label: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export async function listSchedulesForAgent(agentId: string): Promise<AgentSchedule[]> {
  const { data, error } = await supabaseAdmin
    .from("agent_schedules")
    .select("*")
    .eq("agent_id", agentId)
    .order("day_of_week")
    .order("start_time");
  if (error) throw error;
  return data ?? [];
}

export async function listAllSchedules(): Promise<AgentSchedule[]> {
  const { data, error } = await supabaseAdmin
    .from("agent_schedules")
    .select("*")
    .order("day_of_week")
    .order("start_time");
  if (error) throw error;
  return data ?? [];
}

export async function createSchedule(input: {
  agent_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  label?: string | null;
  timezone?: string;
}): Promise<AgentSchedule> {
  const { data, error } = await supabaseAdmin
    .from("agent_schedules")
    .insert({ ...input, timezone: input.timezone ?? "America/New_York", updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSchedule(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("agent_schedules")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function updateSchedule(
  id: string,
  patch: Partial<Pick<AgentSchedule, "start_time" | "end_time" | "label" | "day_of_week">>
): Promise<AgentSchedule> {
  const { data, error } = await supabaseAdmin
    .from("agent_schedules")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
