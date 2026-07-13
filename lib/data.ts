import { supabaseAdmin } from "./supabaseAdmin";
import { Agent, AgentDates, AgentFull, ChecksMap } from "./types";

function toChecksMap(rows: { step_id: string; checked: boolean; checked_at: string | null; checked_by: "agent" | "admin" | null }[]): ChecksMap {
  const map: ChecksMap = {};
  for (const row of rows) {
    map[row.step_id] = {
      checked: row.checked,
      checked_at: row.checked_at,
      checked_by: row.checked_by,
    };
  }
  return map;
}

export async function getAgentFullById(agentId: string): Promise<AgentFull | null> {
  const { data: agent } = await supabaseAdmin
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .maybeSingle();
  if (!agent) return null;
  return hydrateAgent(agent as Agent);
}

export async function getAgentFullByToken(token: string): Promise<AgentFull | null> {
  const { data: agent } = await supabaseAdmin
    .from("agents")
    .select("*")
    .eq("unique_token", token)
    .maybeSingle();
  if (!agent) return null;
  return hydrateAgent(agent as Agent);
}

async function hydrateAgent(agent: Agent): Promise<AgentFull> {
  const [{ data: checkRows }, { data: dateRow }] = await Promise.all([
    supabaseAdmin.from("agent_checks").select("step_id, checked, checked_at, checked_by").eq("agent_id", agent.id),
    supabaseAdmin.from("agent_dates").select("*").eq("agent_id", agent.id).maybeSingle(),
  ]);

  const dates: AgentDates =
    (dateRow as AgentDates) ?? {
      agent_id: agent.id,
      exam_date: null,
      exam_date_set_at: null,
      contracts_sent_at: null,
    };

  return {
    agent,
    checks: toChecksMap(checkRows ?? []),
    dates,
  };
}

export async function listAgentsFull(): Promise<AgentFull[]> {
  const { data: agents } = await supabaseAdmin.from("agents").select("*").order("created_at", { ascending: true });
  if (!agents) return [];
  return Promise.all((agents as Agent[]).map(hydrateAgent));
}

export async function setCheck(
  agentId: string,
  stepId: string,
  checked: boolean,
  checkedBy: "agent" | "admin"
) {
  const { error } = await supabaseAdmin.from("agent_checks").upsert(
    {
      agent_id: agentId,
      step_id: stepId,
      checked,
      checked_at: checked ? new Date().toISOString() : null,
      checked_by: checked ? checkedBy : null,
    },
    { onConflict: "agent_id,step_id" }
  );
  if (error) throw error;
}

export async function setExamDate(agentId: string, examDate: string | null) {
  const { error } = await supabaseAdmin.from("agent_dates").upsert(
    {
      agent_id: agentId,
      exam_date: examDate,
      exam_date_set_at: examDate ? new Date().toISOString() : null,
    },
    { onConflict: "agent_id" }
  );
  if (error) throw error;
}

export async function setContractsSent(agentId: string, sent: boolean) {
  const { error } = await supabaseAdmin.from("agent_dates").upsert(
    {
      agent_id: agentId,
      contracts_sent_at: sent ? new Date().toISOString() : null,
    },
    { onConflict: "agent_id" }
  );
  if (error) throw error;
}

export async function createAgent(input: {
  name: string;
  upline: string | null;
  start_date: string;
  type: "licensed" | "unlicensed";
  phone: string | null;
  email: string | null;
  state: string | null;
}) {
  const { data, error } = await supabaseAdmin
    .from("agents")
    .insert({
      name: input.name,
      upline: input.upline,
      start_date: input.start_date,
      type: input.type,
      phone: input.phone,
      email: input.email,
      state: input.state,
    })
    .select()
    .single();
  if (error) throw error;

  await supabaseAdmin.from("agent_dates").insert({ agent_id: data.id });

  return data as Agent;
}
