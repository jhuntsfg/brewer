import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type Interviewer = {
  id: string;
  name: string;
  email: string;
  active: boolean;
};

export async function getInterviewerEmail(ownerName: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("interviewers")
    .select("email")
    .eq("name", ownerName)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  return data?.email ?? null;
}

export async function listInterviewers(): Promise<Interviewer[]> {
  const { data } = await supabaseAdmin
    .from("interviewers")
    .select("*")
    .eq("active", true)
    .order("name");
  return (data ?? []) as Interviewer[];
}
