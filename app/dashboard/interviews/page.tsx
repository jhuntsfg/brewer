"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { computeAgent, ComputedAgent } from "@/lib/computed";
import { AgentFull } from "@/lib/types";
import { Interview, EnrollmentStatus, InterviewEmail } from "@/lib/interviews";
import Sidebar from "@/components/Sidebar";
import AddAgentModal from "@/components/AddAgentModal";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }) + ", " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getWeekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Mon
  const start = new Date(now);
  start.setDate(now.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

function InterviewMetrics({ interviews }: { interviews: Interview[] }) {
  const bookedThisWeek = interviews.length;

  const responded = interviews.filter((i) => i.showed !== null);
  const showed = interviews.filter((i) => i.showed === true).length;
  const didntShow = interviews.filter((i) => i.showed === false).length;
  const showRate =
    showed + didntShow > 0
      ? Math.round((showed / (showed + didntShow)) * 100)
      : null;

  const hired = interviews.filter((i) => i.hired === true).length;
  const hireRate =
    showed > 0 ? Math.round((hired / showed) * 100) : null;

  const enrolled = interviews.filter((i) => i.enrollment_status === "enrolled").length;
  const licensed = interviews.filter((i) => i.enrollment_status === "licensed").length;
  const enrolledRate = showed > 0 ? Math.round((enrolled / showed) * 100) : null;
  const licensedRate = showed > 0 ? Math.round((licensed / showed) * 100) : null;
  const now = new Date();
  const needsUpdated = interviews.filter((i) => i.showed === null && new Date(i.scheduled_at) < now).length;

  const cards = [
    { label: "Booked", value: String(bookedThisWeek) },
    { label: "Needs updated", value: String(needsUpdated), highlight: needsUpdated > 0 },
    { label: "Show rate", value: showRate !== null ? `${showRate}% (${showed})` : "—" },
    { label: "Hire rate", value: hireRate !== null ? `${hireRate}% (${hired})` : "—" },
    { label: "Enrolled", value: enrolledRate !== null ? `${enrolledRate}% (${enrolled})` : "—" },
    { label: "Licensed", value: licensedRate !== null ? `${licensedRate}% (${licensed})` : "—" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-xl border p-4 ${c.highlight ? "bg-yellow-50 border-yellow-200" : "bg-white border-gray-100"}`}>
          <p className={`text-xl font-semibold truncate ${c.highlight ? "text-yellow-700" : "text-gray-700"}`}>{c.value}</p>
          <p className={`text-sm ${c.highlight ? "text-yellow-600" : "text-gray-500"}`}>{c.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Filters ─────────────────────────────────────────────────────────────────

type DateRange = "all" | "today" | "week" | "month" | "custom";

function OwnerMultiSelect({
  ownerOptions,
  selectedOwners,
  setSelectedOwners,
}: {
  ownerOptions: string[];
  selectedOwners: string[];
  setSelectedOwners: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = selectedOwners.length === 0
    ? "All interviewers"
    : selectedOwners.length === 1
    ? selectedOwners[0]
    : `${selectedOwners.length} interviewers`;

  function toggle(owner: string) {
    setSelectedOwners(
      selectedOwners.includes(owner)
        ? selectedOwners.filter((o) => o !== owner)
        : [...selectedOwners, owner]
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-background outline-none focus:border-primary flex items-center gap-2"
      >
        <span className={selectedOwners.length ? "text-gray-800" : "text-gray-500"}>{label}</span>
        <span className="text-gray-400 text-xs">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-48 max-h-64 overflow-y-auto">
            {selectedOwners.length > 0 && (
              <button
                onClick={() => { setSelectedOwners([]); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs text-primary hover:bg-background"
              >
                Clear selection
              </button>
            )}
            {ownerOptions.map((o) => (
              <label key={o} className="flex items-center gap-2 px-3 py-2 hover:bg-background cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedOwners.includes(o)}
                  onChange={() => toggle(o)}
                  className="accent-primary"
                />
                <span className="text-sm text-gray-700">{o}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function InterviewFilters({
  nameQuery,
  setNameQuery,
  selectedOwners,
  setSelectedOwners,
  ownerOptions,
  dateRange,
  setDateRange,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  statusFilter,
  setStatusFilter,
}: {
  nameQuery: string;
  setNameQuery: (v: string) => void;
  selectedOwners: string[];
  setSelectedOwners: (v: string[]) => void;
  ownerOptions: string[];
  dateRange: DateRange;
  setDateRange: (v: DateRange) => void;
  customStart: string;
  setCustomStart: (v: string) => void;
  customEnd: string;
  setCustomEnd: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <input
        value={nameQuery}
        onChange={(e) => setNameQuery(e.target.value)}
        placeholder="Search interviewee…"
        className="rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-primary bg-background text-sm"
      />
      <OwnerMultiSelect
        ownerOptions={ownerOptions}
        selectedOwners={selectedOwners}
        setSelectedOwners={setSelectedOwners}
      />
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {(["all", "today", "week", "month", "custom"] as DateRange[]).map((r) => (
          <button
            key={r}
            onClick={() => setDateRange(r)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              dateRange === r
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {r === "all" ? "All time" : r === "today" ? "Today" : r === "week" ? "This week" : r === "month" ? "This month" : "Custom"}
          </button>
        ))}
      </div>
      {dateRange === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-primary bg-background text-sm"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-primary bg-background text-sm"
          />
        </div>
      )}
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-primary bg-background text-sm"
      >
        <option value="all">All statuses</option>
        <option value="pending">Pending</option>
        <option value="enrolled">Enrolled</option>
        <option value="licensed">Licensed</option>
        <option value="none">No status</option>
      </select>
    </div>
  );
}

// ─── Status Pill ─────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: EnrollmentStatus }) {
  if (!status) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        No status
      </span>
    );
  }
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    enrolled: "bg-primary-light text-primary",
    licensed: "bg-sky-light text-sky-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-500"}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Boolean icon ─────────────────────────────────────────────────────────────

function BoolIcon({ value }: { value: boolean | null }) {
  if (value === true)
    return <span className="text-green-600 font-bold text-base">✓</span>;
  if (value === false)
    return <span className="text-stall font-bold text-base">✕</span>;
  return <span className="text-gray-300">—</span>;
}

// ─── Table ───────────────────────────────────────────────────────────────────

type SortCol = "name" | "date" | "owner" | "showed" | "hired" | "status";
type SortDir = "asc" | "desc";

function sortInterviews(interviews: Interview[], col: SortCol, dir: SortDir): Interview[] {
  const mult = dir === "asc" ? 1 : -1;
  return [...interviews].sort((a, b) => {
    let cmp = 0;
    if (col === "name") cmp = a.interviewee_name.localeCompare(b.interviewee_name);
    else if (col === "date") cmp = a.scheduled_at.localeCompare(b.scheduled_at);
    else if (col === "owner") cmp = (a.owner ?? "").localeCompare(b.owner ?? "");
    else if (col === "showed") cmp = (a.showed === b.showed ? 0 : a.showed ? -1 : 1);
    else if (col === "hired") cmp = (a.hired === b.hired ? 0 : a.hired ? -1 : 1);
    else if (col === "status") cmp = (a.enrollment_status ?? "").localeCompare(b.enrollment_status ?? "");
    return cmp * mult;
  });
}

function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-gray-300">↕</span>;
  return <span className="ml-1 text-primary">{dir === "asc" ? "↑" : "↓"}</span>;
}

function InterviewTable({
  interviews,
  agents,
  onRowClick,
  checked,
  onToggleCheck,
  onToggleAll,
}: {
  interviews: Interview[];
  agents: ComputedAgent[];
  onRowClick: (i: Interview) => void;
  checked: Set<string>;
  onToggleCheck: (id: string) => void;
  onToggleAll: () => void;
}) {
  const [sortCol, setSortCol] = useState<SortCol>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  const sorted = sortInterviews(interviews, sortCol, sortDir);
  const allChecked = interviews.length > 0 && interviews.every((i) => checked.has(i.id));

  if (interviews.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
        No interviews found.
      </div>
    );
  }

  function Th({ col, label, center }: { col: SortCol; label: string; center?: boolean }) {
    return (
      <th
        className={`px-4 py-3 text-gray-500 font-medium cursor-pointer hover:text-gray-700 select-none ${center ? "text-center" : "text-left"}`}
        onClick={() => handleSort(col)}
      >
        {label}<SortIcon col={col} active={sortCol === col} dir={sortDir} />
      </th>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="px-4 py-3 w-10">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={onToggleAll}
                className="accent-primary rounded"
              />
            </th>
            <Th col="name" label="Interviewee" />
            <th className="text-left px-4 py-3 text-gray-500 font-medium">Phone</th>
            <th className="text-left px-4 py-3 text-gray-500 font-medium">State</th>
            <Th col="date" label="Date / Time" />
            <Th col="owner" label="Owner" />
            <Th col="showed" label="Showed" center />
            <Th col="hired" label="Hired" center />
            <Th col="status" label="Status" />
            <th className="text-left px-4 py-3 text-gray-500 font-medium">Onboarding</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((i) => {
            const linkedAgent = i.linked_agent_id
              ? agents.find((a) => a.agent.id === i.linked_agent_id)
              : null;
            const isChecked = checked.has(i.id);
            return (
              <tr
                key={i.id}
                className={`border-b border-gray-50 hover:bg-background transition-colors ${isChecked ? "bg-primary-light/30" : ""}`}
              >
                <td className="px-4 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleCheck(i.id)}
                    className="accent-primary rounded"
                  />
                </td>
                <td className="px-4 py-3 cursor-pointer" onClick={() => onRowClick(i)}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">{i.interviewee_name}</span>
                    {i.source === "manual" && (
                      <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
                        manual
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap cursor-pointer" onClick={() => onRowClick(i)}>
                  {i.phone || "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap cursor-pointer" onClick={() => onRowClick(i)}>
                  {i.state || "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap cursor-pointer" onClick={() => onRowClick(i)}>
                  {formatDateTime(i.scheduled_at)}
                </td>
                <td className="px-4 py-3 text-gray-600 cursor-pointer" onClick={() => onRowClick(i)}>{i.owner || "—"}</td>
                <td className="px-4 py-3 text-center cursor-pointer" onClick={() => onRowClick(i)}>
                  <BoolIcon value={i.showed} />
                </td>
                <td className="px-4 py-3 text-center cursor-pointer" onClick={() => onRowClick(i)}>
                  <BoolIcon value={i.hired} />
                </td>
                <td className="px-4 py-3 cursor-pointer" onClick={() => onRowClick(i)}>
                  <StatusPill status={i.enrollment_status} />
                </td>
                <td className="px-4 py-3 cursor-pointer" onClick={() => onRowClick(i)}>
                  {linkedAgent ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-light text-primary">
                      {linkedAgent.stage}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

function InterviewDrawer({
  interview: initial,
  agents,
  onClose,
  onSaved,
  onDeleted,
}: {
  interview: Interview;
  agents: ComputedAgent[];
  onClose: () => void;
  onSaved: (updated: Interview) => void;
  onDeleted: (id: string) => void;
}) {
  const [interview, setInterview] = useState<Interview>(initial);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [emails, setEmails] = useState<InterviewEmail[]>([]);

  useEffect(() => {
    fetch(`/api/admin/interviews/${initial.id}/emails`)
      .then((r) => r.json())
      .then((d) => setEmails(d.emails ?? []));
  }, [initial.id]);

  useEffect(() => {
    setInterview(initial);
    setDirty(false);
  }, [initial.id]);

  function patch(updates: Partial<Interview>) {
    setInterview((prev) => ({ ...prev, ...updates }));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/interviews/${interview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: interview.owner,
          showed: interview.showed,
          hired: interview.hired,
          enrollment_status: interview.enrollment_status,
          notes: interview.notes,
        }),
      });
      if (res.ok) {
        const { interview: updated } = await res.json();
        setInterview(updated);
        onSaved(updated);
        setDirty(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveOnBlur() {
    if (!dirty) return;
    await save();
  }

  async function handleDelete() {
    if (!window.confirm("Delete this interview? This cannot be undone.")) return;
    await fetch(`/api/admin/interviews/${interview.id}`, { method: "DELETE" });
    onDeleted(interview.id);
  }

  const linkedAgent = interview.linked_agent_id
    ? agents.find((a) => a.agent.id === interview.linked_agent_id)
    : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/10"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800 truncate pr-4">
            {interview.interviewee_name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Read-only info */}
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-24 shrink-0">Scheduled</span>
              <span className="text-gray-700">{formatDateTime(interview.scheduled_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-24 shrink-0">Source</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                {interview.source}
              </span>
            </div>
            {interview.email && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-24 shrink-0">Email</span>
                <span className="text-gray-700">{interview.email}</span>
              </div>
            )}
            {interview.phone && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-24 shrink-0">Phone</span>
                <span className="text-gray-700">{interview.phone}</span>
              </div>
            )}
            {interview.state && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-24 shrink-0">State</span>
                <span className="text-gray-700">{interview.state}</span>
              </div>
            )}
          </div>

          {/* Owner */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Owner</label>
            <input
              value={interview.owner}
              onChange={(e) => patch({ owner: e.target.value })}
              onBlur={saveOnBlur}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-primary bg-background text-sm"
            />
          </div>

          {/* Showed */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Showed</label>
            <div className="flex gap-2">
              {([true, false, null] as (boolean | null)[]).map((v) => (
                <button
                  key={String(v)}
                  onClick={() => { patch({ showed: v }); }}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    interview.showed === v
                      ? "bg-primary text-white border-primary"
                      : "border-gray-200 text-gray-600 hover:border-primary"
                  }`}
                >
                  {v === true ? "Yes" : v === false ? "No" : "Unknown"}
                </button>
              ))}
            </div>
          </div>

          {/* Hired */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hired</label>
            <div className="flex gap-2">
              {([true, false, null] as (boolean | null)[]).map((v) => (
                <button
                  key={String(v)}
                  disabled={interview.showed !== true}
                  onClick={() => { patch({ hired: v }); }}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    interview.hired === v
                      ? "bg-primary text-white border-primary"
                      : "border-gray-200 text-gray-600 hover:border-primary"
                  }`}
                >
                  {v === true ? "Yes" : v === false ? "No" : "Unknown"}
                </button>
              ))}
            </div>
          </div>

          {/* Enrollment status */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Enrollment status</label>
            <select
              value={interview.enrollment_status ?? ""}
              onChange={(e) =>
                patch({ enrollment_status: (e.target.value || null) as EnrollmentStatus })
              }
              onBlur={saveOnBlur}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-primary bg-background text-sm"
            >
              <option value="">No status</option>
              <option value="pending">Pending</option>
              <option value="enrolled">Enrolled</option>
              <option
                value="licensed"
                disabled={interview.hired !== true}
              >
                Licensed{interview.hired !== true ? " (hire first)" : ""}
              </option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Notes</label>
            <textarea
              value={interview.notes ?? ""}
              onChange={(e) => patch({ notes: e.target.value })}
              onBlur={saveOnBlur}
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-primary bg-background text-sm resize-none"
            />
          </div>

          {/* Linked agent */}
          {linkedAgent && (
            <div className="pt-2 border-t border-gray-100">
              <Link
                href={`/dashboard/${interview.linked_agent_id}`}
                className="text-sm text-primary hover:underline font-medium"
              >
                View onboarding →
              </Link>
              <p className="text-xs text-gray-400 mt-0.5">Stage: {linkedAgent.stage}</p>
            </div>
          )}

          {/* Email history */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reminders sent</p>
              {emails.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-xs font-medium">
                  {emails.length}
                </span>
              )}
            </div>
            {emails.length === 0 ? (
              <p className="text-xs text-gray-400">No reminders sent yet.</p>
            ) : (
              <div className="space-y-1">
                {emails.map((e) => (
                  <div key={e.id} className="text-xs text-gray-500">
                    <span className="text-gray-700">{e.sent_to}</span>
                    {" · "}
                    {new Date(e.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {" "}
                    {new Date(e.sent_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 space-y-2">
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="w-full bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={handleDelete}
            className="w-full rounded-lg py-2 text-sm font-medium text-stall hover:bg-red-50 transition-colors"
          >
            Delete interview
          </button>
        </div>
      </div>
    </>
  );
}

// ─── New Interview Modal ──────────────────────────────────────────────────────

function NewInterviewModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (i: Interview) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [owner, setOwner] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !owner.trim() || !scheduledAt) {
      setError("Name, owner, and date/time are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewee_name: name.trim(),
          phone: phone || null,
          email: email || null,
          owner: owner.trim(),
          scheduled_at: new Date(scheduledAt).toISOString(),
          notes: notes || null,
          source: "manual",
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error || "Failed to create.");
        return;
      }
      const { interview } = await res.json();
      onCreated(interview);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-800">New Interview</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-primary bg-background text-sm"
              placeholder="Jane Smith"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-primary bg-background text-sm"
                placeholder="555-1234"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-primary bg-background text-sm"
                placeholder="jane@example.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Owner *</label>
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-primary bg-background text-sm"
              placeholder="Recruiter name"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Scheduled date & time *</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-primary bg-background text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-primary bg-background text-sm resize-none"
            />
          </div>
          {error && <p className="text-sm text-stall">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:border-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── CSV Import Modal ─────────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === "," && !inQuote) { values.push(cur); cur = ""; }
      else { cur += ch; }
    }
    values.push(cur);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (values[i] ?? "").trim(); });
    return row;
  });
}

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [status, setStatus] = useState<"idle" | "preview" | "importing" | "done">("idle");
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [error, setError] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) { setError("No rows found — make sure the file has a header row."); return; }
      setRows(parsed);
      setStatus("preview");
      setError("");
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    setStatus("importing");
    const res = await fetch("/api/admin/interviews/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    const data = await res.json();
    setResult(data);
    setStatus("done");
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-800">Import from CSV</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        {status === "idle" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Export your Google Sheet as CSV. Expected columns:
            </p>
            <p className="text-xs font-mono bg-gray-50 rounded-lg p-3 text-gray-600 leading-relaxed">
              Interviewee, Interview Date, Email, Phone, Ran by?, Show? Y/N, Hired? Y/N, Purchased Course, Additional Notes
            </p>
            <p className="text-xs text-gray-400">Duplicates (matched by email or name) will be skipped.</p>
            {error && <p className="text-sm text-stall">{error}</p>}
            <label className="block w-full cursor-pointer rounded-lg border-2 border-dashed border-gray-200 hover:border-primary transition-colors p-6 text-center">
              <span className="text-sm text-gray-500">Click to select CSV file</span>
              <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
            </label>
          </div>
        )}

        {status === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Found <span className="font-semibold">{rows.length}</span> rows. Ready to import?
            </p>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-3 py-2 text-left text-gray-500">Name</th>
                    <th className="px-3 py-2 text-left text-gray-500">Date</th>
                    <th className="px-3 py-2 text-left text-gray-500">Owner</th>
                    <th className="px-3 py-2 text-left text-gray-500">Hired</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="px-3 py-2 text-gray-700">{r["Interviewee"]}</td>
                      <td className="px-3 py-2 text-gray-500">{r["Interview Date"]}</td>
                      <td className="px-3 py-2 text-gray-500">{r["Ran by?"]}</td>
                      <td className="px-3 py-2 text-gray-500">{r["Hired? Y/N"]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:border-gray-300">Cancel</button>
              <button onClick={handleImport} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-dark transition-colors">Import {rows.length} rows</button>
            </div>
          </div>
        )}

        {status === "importing" && (
          <p className="text-sm text-gray-500 py-4 text-center">Importing… please wait</p>
        )}

        {status === "done" && result && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4 space-y-1">
              <p className="text-sm text-gray-700"><span className="font-semibold text-green-600">{result.created}</span> interviews imported</p>
              <p className="text-sm text-gray-500"><span className="font-semibold">{result.skipped}</span> skipped (duplicates or missing data)</p>
              {result.errors.length > 0 && (
                <p className="text-sm text-stall"><span className="font-semibold">{result.errors.length}</span> errors</p>
              )}
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-24 overflow-y-auto text-xs text-stall space-y-1">
                {result.errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}
            <button onClick={onClose} className="w-full bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-dark transition-colors">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab nav ─────────────────────────────────────────────────────────────────

function TabNav() {
  const pathname = usePathname();
  const isInterviews = pathname?.startsWith("/dashboard/interviews");
  const isOnboarding = !isInterviews;
  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      <Link
        href="/dashboard"
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
          isOnboarding ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
        }`}
      >
        Onboarding
      </Link>
      <Link
        href="/dashboard/interviews"
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
          isInterviews ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
        }`}
      >
        Interviews
      </Link>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function InterviewsPage() {
  const router = useRouter();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [agents, setAgents] = useState<ComputedAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Filters
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [nameQuery, setNameQuery] = useState("");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const loadData = useCallback(async () => {
    const [intRes, agentRes] = await Promise.all([
      fetch("/api/admin/interviews"),
      fetch("/api/admin/agents"),
    ]);
    if (intRes.status === 401 || agentRes.status === 401) {
      router.push("/");
      return;
    }
    const { interviews: ivs } = await intRes.json();
    const { agents: ags } = await agentRes.json();
    setInterviews(ivs ?? []);
    setAgents((ags as AgentFull[]).map((a) => computeAgent(a)));
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("interviews-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "interviews" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "agents" }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const ownerOptions = [...new Set(interviews.map((i) => i.owner).filter(Boolean))].sort();

  // Filtered interviews
  const filtered = interviews.filter((i) => {
    if (nameQuery && !i.interviewee_name.toLowerCase().includes(nameQuery.toLowerCase())) return false;
    if (selectedOwners.length > 0 && !selectedOwners.includes(i.owner)) return false;
    if (dateRange === "today") {
      const d = new Date(i.scheduled_at);
      const now = new Date();
      if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth() || d.getDate() !== now.getDate()) return false;
    }
    if (dateRange === "week") {
      const { start, end } = getWeekBounds();
      const d = new Date(i.scheduled_at);
      if (d < start || d > end) return false;
    }
    if (dateRange === "month") {
      const now = new Date();
      const d = new Date(i.scheduled_at);
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
    }
    if (dateRange === "custom") {
      const d = new Date(i.scheduled_at);
      if (customStart && d < new Date(customStart)) return false;
      if (customEnd) {
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
    }
    if (statusFilter !== "all") {
      if (statusFilter === "none" && i.enrollment_status !== null) return false;
      if (statusFilter !== "none" && i.enrollment_status !== statusFilter) return false;
    }
    return true;
  });

  function handleInterviewSaved(updated: Interview) {
    setInterviews((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    setSelectedInterview(updated);
  }

  function toggleCheck(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const allIds = filtered.map((i) => i.id);
    const allSelected = allIds.every((id) => checked.has(id));
    if (allSelected) {
      setChecked((prev) => {
        const next = new Set(prev);
        allIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setChecked((prev) => {
        const next = new Set(prev);
        allIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  async function bulkDelete() {
    const ids = [...checked];
    if (!window.confirm(`Delete ${ids.length} interview${ids.length === 1 ? "" : "s"}? This cannot be undone.`)) return;
    await Promise.all(ids.map((id) => fetch(`/api/admin/interviews/${id}`, { method: "DELETE" })));
    setInterviews((prev) => prev.filter((i) => !checked.has(i.id)));
    setChecked(new Set());
    if (selectedInterview && checked.has(selectedInterview.id)) setSelectedInterview(null);
  }

  async function bulkMarkNoShow() {
    const ids = [...checked].filter((id) => {
      const i = interviews.find((x) => x.id === id);
      return i && i.showed !== false;
    });
    if (ids.length === 0) return;
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/admin/interviews/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ showed: false }),
        })
      )
    );
    setInterviews((prev) =>
      prev.map((i) => (ids.includes(i.id) ? { ...i, showed: false } : i))
    );
    setChecked(new Set());
  }

  const checkedCount = checked.size;
  const checkedNoShowEligible = [...checked].filter((id) => {
    const i = interviews.find((x) => x.id === id);
    return i && i.showed !== false;
  }).length;

  if (loading) {
    return <div className="p-8 text-gray-400">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar agents={agents} onAddAgent={() => setShowAddAgentModal(true)} />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <TabNav />
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:border-primary hover:text-primary transition-colors"
            >
              Import CSV
            </button>
            <button
              onClick={() => setShowNewModal(true)}
              className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              + New Interview
            </button>
          </div>
        </div>

        <InterviewMetrics interviews={filtered} />
        <InterviewFilters
          nameQuery={nameQuery}
          setNameQuery={setNameQuery}
          selectedOwners={selectedOwners}
          setSelectedOwners={setSelectedOwners}
          ownerOptions={ownerOptions}
          dateRange={dateRange}
          setDateRange={setDateRange}
          customStart={customStart}
          setCustomStart={setCustomStart}
          customEnd={customEnd}
          setCustomEnd={setCustomEnd}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />
        {checkedCount > 0 && (
          <div className="flex items-center gap-3 mb-3 px-4 py-3 bg-primary-light border border-primary/20 rounded-xl">
            <span className="text-sm font-medium text-primary">{checkedCount} selected</span>
            <div className="flex gap-2 ml-auto">
              {checkedNoShowEligible > 0 && (
                <button
                  onClick={bulkMarkNoShow}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium border border-stall/30 text-stall bg-white hover:bg-red-50 transition-colors"
                >
                  Mark {checkedNoShowEligible} as no-show
                </button>
              )}
              <button
                onClick={bulkDelete}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-stall text-white hover:bg-red-700 transition-colors"
              >
                Delete {checkedCount}
              </button>
              <button
                onClick={() => setChecked(new Set())}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 bg-white hover:border-gray-300 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}
        <InterviewTable
          interviews={filtered}
          agents={agents}
          onRowClick={(i) => setSelectedInterview(i)}
          checked={checked}
          onToggleCheck={toggleCheck}
          onToggleAll={toggleAll}
        />
      </main>

      {selectedInterview && (
        <InterviewDrawer
          interview={selectedInterview}
          agents={agents}
          onClose={() => setSelectedInterview(null)}
          onSaved={handleInterviewSaved}
          onDeleted={(id) => {
            setInterviews((prev) => prev.filter((i) => i.id !== id));
            setSelectedInterview(null);
          }}
        />
      )}

      {showNewModal && (
        <NewInterviewModal
          onClose={() => setShowNewModal(false)}
          onCreated={(created) => {
            setInterviews((prev) => [created, ...prev]);
            setShowNewModal(false);
            setSelectedInterview(created);
          }}
        />
      )}

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onDone={() => { loadData(); }}
        />
      )}

      {showAddAgentModal && (
        <AddAgentModal
          onClose={() => setShowAddAgentModal(false)}
          onCreated={(agentId) => router.push(`/dashboard/${agentId}`)}
        />
      )}
    </div>
  );
}
