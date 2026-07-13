export type AgentType = "licensed" | "unlicensed";

export type Agent = {
  id: string;
  name: string;
  upline: string | null;
  start_date: string;
  type: AgentType;
  unique_token: string;
  created_at: string;
  phone: string | null;
  email: string | null;
  state: string | null;
  notes: string | null;
  stall_snoozed_until: string | null;
};

export type CheckRecord = {
  checked: boolean;
  checked_at: string | null;
  checked_by: "agent" | "admin" | null;
};

export type ChecksMap = Record<string, CheckRecord>;

export type AgentDates = {
  agent_id: string;
  exam_date: string | null;
  exam_date_set_at: string | null;
  contracts_sent_at: string | null;
};

export type AgentFull = {
  agent: Agent;
  checks: ChecksMap;
  dates: AgentDates;
};
