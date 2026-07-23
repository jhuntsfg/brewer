"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { computeAgent, ComputedAgent } from "@/lib/computed";
import { AgentFull } from "@/lib/types";
import Sidebar from "@/components/Sidebar";
import MetricsRow from "@/components/MetricsRow";
import StallBanner from "@/components/StallBanner";
import FunnelGroups from "@/components/FunnelGroups";
import AddAgentModal from "@/components/AddAgentModal";

export type SortKey = "funnel" | "added" | "upline";

function sortAgents(agents: ComputedAgent[], sort: SortKey): ComputedAgent[] {
  const copy = [...agents];
  if (sort === "added") {
    return copy.sort((a, b) => a.agent.created_at.localeCompare(b.agent.created_at));
  }
  if (sort === "upline") {
    return copy.sort((a, b) => {
      const ua = a.agent.upline ?? "";
      const ub = b.agent.upline ?? "";
      return ua.localeCompare(ub) || a.agent.name.localeCompare(b.agent.name);
    });
  }
  // "funnel" — default, handled inside FunnelGroups
  return copy;
}

type ViewKey = "active" | "archived";

export default function DashboardPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<ComputedAgent[] | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sort, setSort] = useState<SortKey>("funnel");
  const [view, setView] = useState<ViewKey>("active");

  async function load() {
    const res = await fetch("/api/admin/agents");
    if (res.status === 401) {
      router.push("/");
      return;
    }
    const { agents } = await res.json();
    setAgents((agents as AgentFull[]).map((a) => computeAgent(a)));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();

    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_checks" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_dates" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "agents" }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (!agents) {
    return <div className="p-8 text-gray-400">Loading…</div>;
  }

  const activeAgents = agents.filter((a) => !a.agent.archived_at);
  const archivedAgents = agents.filter((a) => !!a.agent.archived_at);
  const visibleAgents = view === "archived" ? archivedAgents : activeAgents;
  const sorted = sortAgents(visibleAgents, sort);

  return (
    <div className="flex min-h-screen">
      <Sidebar agents={activeAgents} onAddAgent={() => setShowAddModal(true)} />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-end mb-6">
          <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-800">
            Sign out
          </button>
        </div>
        <MetricsRow agents={activeAgents} />
        <StallBanner agents={activeAgents} />
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 mb-4 w-fit">
          {(["active", "archived"] as ViewKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {key === "active" ? "Active" : `Archived (${archivedAgents.length})`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-400">Sort by</span>
          {(["funnel", "added", "upline"] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                sort === key
                  ? "bg-primary text-white border-primary"
                  : "border-gray-200 text-gray-600 hover:border-primary hover:text-primary"
              }`}
            >
              {key === "funnel" ? "Funnel stage" : key === "added" ? "Date added" : "Upline"}
            </button>
          ))}
        </div>
        {sorted.length === 0 ? (
          <p className="text-sm text-gray-400">
            {view === "archived" ? "No archived agents." : "No active agents."}
          </p>
        ) : (
          <FunnelGroups agents={sorted} sort={sort} />
        )}
      </main>
      {showAddModal && (
        <AddAgentModal
          onClose={() => setShowAddModal(false)}
          onCreated={(agentId) => router.push(`/dashboard/${agentId}`)}
        />
      )}
    </div>
  );
}
