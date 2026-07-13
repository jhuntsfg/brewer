import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type EnrollmentStatus = "enrolled" | "pending" | "licensed" | null;

export type Interview = {
  id: string;
  interviewee_name: string;
  phone: string | null;
  email: string | null;
  scheduled_at: string;
  owner: string;
  showed: boolean | null;
  hired: boolean | null;
  enrollment_status: EnrollmentStatus;
  notes: string | null;
  source: "calendly" | "manual";
  canceled_at: string | null;
  linked_agent_id: string | null;
  calendly_event_uri: string | null;
  state: string | null;
  created_at: string;
  updated_at: string;
};

export async function listInterviews(): Promise<Interview[]> {
  const { data, error } = await supabaseAdmin
    .from("interviews")
    .select("*")
    .is("canceled_at", null)
    .order("scheduled_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Interview[];
}

export async function getInterview(id: string): Promise<Interview | null> {
  const { data, error } = await supabaseAdmin
    .from("interviews")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Interview | null;
}

export type CreateInterviewInput = {
  interviewee_name: string;
  phone?: string | null;
  email?: string | null;
  scheduled_at: string;
  owner: string;
  showed?: boolean | null;
  hired?: boolean | null;
  enrollment_status?: EnrollmentStatus;
  notes?: string | null;
  source?: "calendly" | "manual";
  calendly_event_uri?: string | null;
  state?: string | null;
};

export async function createInterview(input: CreateInterviewInput): Promise<Interview> {
  const { data, error } = await supabaseAdmin
    .from("interviews")
    .insert({
      interviewee_name: input.interviewee_name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      scheduled_at: input.scheduled_at,
      owner: input.owner,
      showed: input.showed ?? null,
      hired: input.hired ?? null,
      enrollment_status: input.enrollment_status ?? null,
      notes: input.notes ?? null,
      source: input.source ?? "manual",
      calendly_event_uri: input.calendly_event_uri ?? null,
      state: input.state ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Interview;
}

export type UpdateInterviewPatch = Partial<{
  owner: string;
  showed: boolean | null;
  hired: boolean | null;
  enrollment_status: EnrollmentStatus;
  notes: string | null;
  canceled_at: string | null;
  linked_agent_id: string | null;
  state: string | null;
}>;

export async function updateInterview(id: string, patch: UpdateInterviewPatch): Promise<Interview> {
  const { data, error } = await supabaseAdmin
    .from("interviews")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Interview;
}

export type InterviewEmail = {
  id: string;
  interview_id: string;
  sent_to: string;
  subject: string | null;
  sent_at: string;
};

export async function listInterviewEmails(interviewId: string): Promise<InterviewEmail[]> {
  const { data, error } = await supabaseAdmin
    .from("interview_emails")
    .select("*")
    .eq("interview_id", interviewId)
    .order("sent_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as InterviewEmail[];
}

export async function deleteInterview(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("interviews").delete().eq("id", id);
  if (error) throw error;
}

export async function createAgentFromInterview(
  interviewId: string,
  enrollmentStatus: "enrolled" | "licensed"
): Promise<void> {
  const interview = await getInterview(interviewId);
  if (!interview) throw new Error("Interview not found");
  if (interview.linked_agent_id) return; // already linked

  const agentType = enrollmentStatus === "licensed" ? "licensed" : "unlicensed";
  const today = new Date().toISOString().slice(0, 10);

  const { data: agent, error: agentError } = await supabaseAdmin
    .from("agents")
    .insert({
      name: interview.interviewee_name,
      phone: interview.phone,
      email: interview.email,
      start_date: today,
      type: agentType,
      upline: interview.owner || null,
      state: interview.state || null,
    })
    .select()
    .single();
  if (agentError) throw agentError;

  // Create agent_dates row
  await supabaseAdmin.from("agent_dates").insert({ agent_id: agent.id });

  // Link the interview to the new agent
  const { error: linkError } = await supabaseAdmin
    .from("interviews")
    .update({ linked_agent_id: agent.id, updated_at: new Date().toISOString() })
    .eq("id", interviewId);
  if (linkError) throw linkError;
}
