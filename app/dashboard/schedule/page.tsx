"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { computeAgent, ComputedAgent } from "@/lib/computed";
import { AgentFull } from "@/lib/types";
import { AgentSchedule } from "@/lib/schedules";
import Sidebar from "@/components/Sidebar";
import { TIMEZONES, slotLabel } from "@/components/WeeklySchedule";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am–10pm

function fmtHour(h: number) {
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60).toString().padStart(2, "0");
  const min = (m % 60).toString().padStart(2, "0");
  return `${h}:${min}`;
}

function tzOffsetMinutes(tz: string): number {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "numeric", minute: "numeric", hour12: false,
    year: "numeric", month: "numeric", day: "numeric",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const localH = get("hour") % 24;
  const localM = get("minute");
  return (localH * 60 + localM) - (now.getUTCHours() * 60 + now.getUTCMinutes());
}

function convertBlock(s: AgentSchedule, viewTz: string): { day: number; startMins: number; endMins: number } {
  const fromOffset = tzOffsetMinutes(s.timezone ?? "America/New_York");
  const toOffset = tzOffsetMinutes(viewTz);
  const diff = toOffset - fromOffset;
  let startMins = timeToMinutes(s.start_time) + diff;
  let endMins = timeToMinutes(s.end_time) + diff;
  let dayOffset = 0;
  if (startMins < 0) { startMins += 24 * 60; endMins += 24 * 60; dayOffset = -1; }
  if (startMins >= 24 * 60) { startMins -= 24 * 60; endMins -= 24 * 60; dayOffset = 1; }
  const day = ((s.day_of_week + dayOffset) % 7 + 7) % 7;
  return { day, startMins, endMins };
}

// Distinct muted colors for agents
const AGENT_COLORS = [
  "bg-blue-400",
  "bg-emerald-400",
  "bg-violet-400",
  "bg-amber-400",
  "bg-rose-400",
  "bg-cyan-400",
  "bg-fuchsia-400",
  "bg-lime-400",
  "bg-orange-400",
  "bg-teal-400",
];

export default function MasterSchedulePage() {
  const router = useRouter();
  const [agents, setAgents] = useState<ComputedAgent[]>([]);
  const [schedules, setSchedules] = useState<AgentSchedule[]>([]);
  const [agentMap, setAgentMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [hiddenAgents, setHiddenAgents] = useState<Set<string>>(new Set());
  const [viewTz, setViewTz] = useState("America/New_York");

  const load = useCallback(async () => {
    const [agentRes, scheduleRes] = await Promise.all([
      fetch("/api/admin/agents"),
      fetch("/api/admin/schedule"),
    ]);
    if (agentRes.status === 401) { router.push("/"); return; }

    const { agents: ags } = await agentRes.json();
    const { schedules: scheds, agents: simpleAgents } = await scheduleRes.json();

    setAgents((ags as AgentFull[]).map((a) => computeAgent(a)));
    setSchedules(scheds ?? []);

    const map: Record<string, string> = {};
    (simpleAgents as { id: string; name: string }[]).forEach((a) => { map[a.id] = a.name; });
    setAgentMap(map);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("master-schedule-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_schedules" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const agentIds = [...new Set(schedules.map((s) => s.agent_id))];
  const colorMap: Record<string, string> = {};
  agentIds.forEach((id, i) => { colorMap[id] = AGENT_COLORS[i % AGENT_COLORS.length]; });

  const GRID_START = 6 * 60;
  const GRID_END = 22 * 60;
  const GRID_SPAN = GRID_END - GRID_START;

  function topPct(mins: number) {
    return ((mins - GRID_START) / GRID_SPAN) * 100;
  }
  function heightPct(startMins: number, endMins: number) {
    return ((endMins - startMins) / GRID_SPAN) * 100;
  }

  function toggleAgent(id: string) {
    setHiddenAgents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) return <div className="p-8 text-gray-400">Loading…</div>;

  const visibleSchedules = schedules.filter((s) => !hiddenAgents.has(s.agent_id));

  return (
    <div className="flex min-h-screen">
      <Sidebar agents={agents} onAddAgent={() => router.push("/dashboard")} />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Master Schedule</h1>
            <p className="text-sm text-gray-500 mt-0.5">All agents&rsquo; committed work hours — recurring weekly</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">View in:</span>
            <select
              value={viewTz}
              onChange={(e) => setViewTz(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary bg-background"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Agent legend / filter */}
        {agentIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {agentIds.map((id) => {
              const name = agentMap[id] ?? "Unknown";
              const color = colorMap[id];
              const hidden = hiddenAgents.has(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleAgent(id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    hidden ? "border-gray-200 text-gray-400 bg-white" : "border-transparent text-white"
                  } ${!hidden ? color : ""}`}
                >
                  {!hidden && <span className="w-2 h-2 rounded-full bg-white/60 inline-block" />}
                  {name}
                </button>
              );
            })}
          </div>
        )}

        {agentIds.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400 text-sm">
            No agents have set their schedule yet. Open any agent&rsquo;s page to add their work hours.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex gap-0">
              {/* Time gutter */}
              <div className="w-12 shrink-0 relative" style={{ height: `${HOURS.length * 52}px` }}>
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full text-right pr-2 text-xs text-gray-400"
                    style={{ top: `${((h - 6) / (HOURS.length - 1)) * 100}%`, transform: "translateY(-50%)" }}
                  >
                    {fmtHour(h)}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {DAYS.map((day, dayIdx) => {
                const dayBlocks = visibleSchedules
                  .map((s) => ({ s, ...convertBlock(s, viewTz) }))
                  .filter((b) => b.day === dayIdx);

                return (
                  <div key={day} className="flex-1 flex flex-col">
                    <div className="text-center text-xs font-medium text-gray-500 pb-1">{day}</div>
                    <div className="relative border-l border-gray-100" style={{ height: `${HOURS.length * 52}px` }}>
                      {HOURS.map((h) => (
                        <div
                          key={h}
                          className="absolute w-full border-t border-gray-100"
                          style={{ top: `${((h - 6) / (HOURS.length - 1)) * 100}%` }}
                        />
                      ))}

                      {dayBlocks.map(({ s, startMins, endMins }, i) => {
                        const top = topPct(startMins);
                        const height = heightPct(startMins, endMins);
                        if (top < 0 || top > 100) return null;
                        const overlap = dayBlocks.filter((b, bi) => bi < i && b.startMins < endMins && b.endMins > startMins).length;
                        const displayStart = minutesToTime(startMins);
                        const displayEnd = minutesToTime(endMins);
                        return (
                          <div
                            key={s.id}
                            title={`${agentMap[s.agent_id] ?? "Agent"}: ${s.label || slotLabel(displayStart, displayEnd)}`}
                            className={`absolute rounded text-white text-xs px-1 py-0.5 overflow-hidden ${colorMap[s.agent_id]}`}
                            style={{
                              top: `${top}%`,
                              height: `${Math.max(height, 3)}%`,
                              left: `${overlap * 4 + 2}%`,
                              right: "2%",
                            }}
                          >
                            <div className="truncate leading-tight font-medium" style={{ fontSize: "10px" }}>
                              {agentMap[s.agent_id]?.split(" ")[0]}
                            </div>
                            <div className="truncate" style={{ fontSize: "9px", opacity: 0.85 }}>
                              {slotLabel(displayStart, displayEnd)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
