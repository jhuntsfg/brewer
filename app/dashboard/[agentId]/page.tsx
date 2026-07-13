"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { computeAgent, ComputedAgent } from "@/lib/computed";
import { AgentFull } from "@/lib/types";
import Sidebar from "@/components/Sidebar";
import Avatar from "@/components/Avatar";
import StallPill from "@/components/StallPill";
import Pipeline from "@/components/Pipeline";
import Checklist from "@/components/Checklist";
import EditAgentModal from "@/components/EditAgentModal";
import WeeklySchedule from "@/components/WeeklySchedule";
import { AgentSchedule } from "@/lib/schedules";

export default function AgentDetailPage() {
  const router = useRouter();
  const params = useParams<{ agentId: string }>();
  const [agents, setAgents] = useState<ComputedAgent[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [notes, setNotes] = useState<string | null>(null);
  const [notesSaved, setNotesSaved] = useState(false);
  const [schedules, setSchedules] = useState<AgentSchedule[]>([]);

  async function load() {
    const res = await fetch("/api/admin/agents");
    if (res.status === 401) {
      router.push("/");
      return;
    }
    const { agents } = await res.json();
    setAgents((agents as AgentFull[]).map((a) => computeAgent(a)));
  }

  async function loadSchedules(agentId: string) {
    const res = await fetch(`/api/admin/agents/${agentId}/schedule`);
    if (res.ok) {
      const { schedules } = await res.json();
      setSchedules(schedules);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    if (params.agentId) loadSchedules(params.agentId);

    const channel = supabase
      .channel("agent-detail-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_checks" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_dates" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_schedules" }, () => { if (params.agentId) loadSchedules(params.agentId); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  async function toggleStep(stepId: string, checked: boolean) {
    await fetch(`/api/admin/agents/${params.agentId}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepId, checked }),
    });
    load();
  }

  async function setExamDate(date: string | null) {
    await fetch(`/api/admin/agents/${params.agentId}/exam-date`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examDate: date }),
    });
    load();
  }

  async function deleteAgent() {
    if (!window.confirm("Remove this agent? This cannot be undone.")) return;
    await fetch(`/api/admin/agents/${params.agentId}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  async function setContractsSent(sent: boolean) {
    await fetch(`/api/admin/agents/${params.agentId}/contracts-sent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sent }),
    });
    load();
  }

  async function snoozeStall(until: string) {
    await fetch(`/api/admin/agents/${params.agentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stall_snoozed_until: until || null }),
    });
    load();
  }

  async function saveNotes(value: string) {
    await fetch(`/api/admin/agents/${params.agentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: value }),
    });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  if (!agents) {
    return <div className="p-8 text-gray-400">Loading…</div>;
  }

  const current = agents.find((a) => a.agent.id === params.agentId);
  if (!current) {
    return <div className="p-8 text-gray-400">Agent not found.</div>;
  }

  // Initialize notes from agent data the first time
  const currentNotes = notes ?? (current.agent.notes ?? "");

  const link = typeof window !== "undefined" ? `${window.location.origin}/agent/${current.agent.unique_token}` : "";

  return (
    <div className="flex min-h-screen">
      <Sidebar agents={agents} activeAgentId={current.agent.id} onAddAgent={() => router.push("/dashboard")} />
      <main className="flex-1 p-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push("/dashboard")} className="text-sm text-gray-500 hover:text-gray-800">
            ← Back to dashboard
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowEdit(true)}
              className="text-sm text-primary hover:underline"
            >
              Edit agent
            </button>
            <button
              onClick={deleteAgent}
              className="text-sm text-stall hover:underline"
            >
              Remove agent
            </button>
            <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-800">
              Sign out
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex items-start gap-4">
            <Avatar name={current.agent.name} stalled={!!current.stall} size="lg" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold">{current.agent.name}</h1>
                <span className="text-xs rounded-full bg-primary-light text-primary px-2 py-0.5 font-medium">
                  {current.stage}
                </span>
                {current.stall && (
                  <div className="flex items-center gap-2">
                    <StallPill label={current.stall.label} />
                    <span className="text-xs text-gray-400">Postpone until:</span>
                    <input
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      defaultValue={current.agent.stall_snoozed_until?.slice(0, 10) ?? ""}
                      onChange={(e) => snoozeStall(e.target.value)}
                      className="text-xs rounded-lg border border-gray-200 px-2 py-1 outline-none focus:border-primary bg-background"
                    />
                    {current.agent.stall_snoozed_until && (
                      <button
                        onClick={() => snoozeStall("")}
                        className="text-xs text-gray-400 hover:text-stall"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {current.agent.upline ? `Upline: ${current.agent.upline} · ` : ""}
                Started {current.agent.start_date} ·{" "}
                <span className="capitalize">{current.agent.type}</span>
                {current.agent.state ? ` · ${current.agent.state}` : ""}
              </p>
              {(current.agent.phone || current.agent.email) && (
                <p className="text-sm text-gray-400 mt-0.5">
                  {current.agent.phone && <span>{current.agent.phone}</span>}
                  {current.agent.phone && current.agent.email && <span> · </span>}
                  {current.agent.email && <a href={`mailto:${current.agent.email}`} className="hover:underline">{current.agent.email}</a>}
                </p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <input
                  readOnly
                  value={link}
                  className="text-xs flex-1 max-w-md rounded-lg border border-gray-200 px-2 py-1 bg-gray-50"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(link);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="text-xs font-medium rounded-full px-3 py-1 border border-primary text-primary hover:bg-primary-light"
                >
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Internal notes</p>
              {notesSaved && <span className="text-xs text-primary">Saved</span>}
            </div>
            <textarea
              value={currentNotes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={(e) => saveNotes(e.target.value)}
              rows={4}
              placeholder="Outreach attempts, outcomes, follow-up reminders…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary bg-background resize-none"
            />
          </div>
        </div>

        <div className="bg-admin border border-admin-border rounded-2xl p-5 mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!current.dates.contracts_sent_at}
              onChange={(e) => setContractsSent(e.target.checked)}
              className="w-5 h-5 accent-[#EF9F27]"
            />
            <div>
              <p className="font-medium">Contracts sent (your action)</p>
              <p className="text-xs text-gray-600">
                Admin-only. Records a timestamp and moves the agent to &ldquo;Contracts sent&rdquo;.
              </p>
            </div>
          </label>
        </div>

        <h2 className="text-lg font-semibold mb-3">Funnel pipeline</h2>
        <div className="mb-8">
          <Pipeline
            agentType={current.agent.type}
            checks={current.checks}
            dates={current.dates}
            onToggleStep={toggleStep}
            onSetExamDate={setExamDate}
          />
        </div>

        <h2 className="text-lg font-semibold mb-3">Checklist</h2>
        <Checklist
          agentType={current.agent.type}
          checks={current.checks}
          onToggle={toggleStep}
          isAdmin
        />

        <h2 className="text-lg font-semibold mt-8 mb-3">Work schedule</h2>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <WeeklySchedule
            schedules={schedules}
            apiBase={`/api/admin/agents/${params.agentId}/schedule`}
            onAdd={(s) => setSchedules((prev) => [...prev, s])}
            onDelete={(id) => setSchedules((prev) => prev.filter((s) => s.id !== id))}
          />
        </div>
      </main>
      {showEdit && (
        <EditAgentModal
          agent={current.agent}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load(); }}
        />
      )}
    </div>
  );
}
