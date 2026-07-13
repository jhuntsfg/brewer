"use client";

import { useState } from "react";
import { AgentSchedule } from "@/lib/schedules";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am–10pm

export const TIMEZONES = [
  { label: "Eastern (ET)",  value: "America/New_York" },
  { label: "Central (CT)",  value: "America/Chicago" },
  { label: "Mountain (MT)", value: "America/Denver" },
  { label: "Pacific (PT)",  value: "America/Los_Angeles" },
  { label: "Alaska (AKT)",  value: "America/Anchorage" },
  { label: "Hawaii (HT)",   value: "Pacific/Honolulu" },
];

// Get the current UTC offset in minutes for a given IANA timezone
function tzOffsetMinutes(tz: string): number {
  const now = new Date();
  // Format a date in the target timezone and compare to UTC
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);

  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const localH = get("hour") % 24;
  const localM = get("minute");
  const utcH = now.getUTCHours();
  const utcM = now.getUTCMinutes();
  return (localH * 60 + localM) - (utcH * 60 + utcM);
}

// Convert a time string from one tz to another, returns [shiftedMinutes, dayOffset]
function convertTime(timeStr: string, fromTz: string, toTz: string): { minutes: number; dayOffset: number } {
  const [h, m] = timeStr.split(":").map(Number);
  const fromOffset = tzOffsetMinutes(fromTz);
  const toOffset = tzOffsetMinutes(toTz);
  const diff = toOffset - fromOffset;
  let totalMins = h * 60 + m + diff;
  let dayOffset = 0;
  if (totalMins < 0) { totalMins += 24 * 60; dayOffset = -1; }
  if (totalMins >= 24 * 60) { totalMins -= 24 * 60; dayOffset = 1; }
  return { minutes: totalMins, dayOffset };
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60).toString().padStart(2, "0");
  const min = (m % 60).toString().padStart(2, "0");
  return `${h}:${min}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function fmtHour(h: number) {
  if (h === 0 || h === 24) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

export function slotLabel(start: string, end: string): string {
  function fmt(t: string) {
    const [h, m] = t.split(":").map(Number);
    const ampm = h < 12 ? "am" : "pm";
    const hr = h % 12 || 12;
    return m === 0 ? `${hr}${ampm}` : `${hr}:${m.toString().padStart(2, "0")}${ampm}`;
  }
  return `${fmt(start)} – ${fmt(end)}`;
}

// Convert a schedule block's times into the view timezone, returning adjusted day + times
function convertBlock(
  s: AgentSchedule,
  viewTz: string
): { day: number; startMins: number; endMins: number } {
  const { minutes: startMins, dayOffset } = convertTime(s.start_time, s.timezone, viewTz);
  const { minutes: endMins } = convertTime(s.end_time, s.timezone, viewTz);
  const day = ((s.day_of_week + dayOffset) % 7 + 7) % 7;
  return { day, startMins, endMins };
}

const SLOT_OPTIONS = [30, 60, 90, 120, 150, 180, 240];

type AddBlockState = {
  day: number;
  start: string;
  duration: number;
  label: string;
  timezone: string;
};

export default function WeeklySchedule({
  schedules,
  apiBase,
  onAdd,
  onDelete,
  defaultViewTz = "America/New_York",
}: {
  schedules: AgentSchedule[];
  apiBase: string;
  onAdd: (s: AgentSchedule) => void;
  onDelete: (id: string) => void;
  defaultViewTz?: string;
}) {
  const [viewTz, setViewTz] = useState(defaultViewTz);
  const [adding, setAdding] = useState<AddBlockState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!adding) return;
    setSaving(true);
    setError("");
    try {
      const end = minutesToTime(timeToMinutes(adding.start) + adding.duration);
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day_of_week: adding.day,
          start_time: adding.start,
          end_time: end,
          label: adding.label || null,
          timezone: adding.timezone,
        }),
      });
      if (!res.ok) { setError("Failed to save."); return; }
      const { schedule } = await res.json();
      onAdd(schedule);
      setAdding(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(apiBase, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduleId: id }),
    });
    onDelete(id);
  }

  const GRID_START = 6 * 60;
  const GRID_END = 22 * 60;
  const GRID_SPAN = GRID_END - GRID_START;

  function topPct(mins: number) {
    return ((mins - GRID_START) / GRID_SPAN) * 100;
  }
  function heightPct(startMins: number, endMins: number) {
    return ((endMins - startMins) / GRID_SPAN) * 100;
  }

  const viewTzLabel = TIMEZONES.find((t) => t.value === viewTz)?.label ?? viewTz;

  return (
    <div>
      {/* Timezone selector */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-500">View in:</span>
        <select
          value={viewTz}
          onChange={(e) => setViewTz(e.target.value)}
          className="rounded-lg border border-gray-200 px-2 py-1 text-xs outline-none focus:border-primary bg-background"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>

      {/* Hour labels + day columns */}
      <div className="flex gap-0">
        {/* Time gutter */}
        <div className="w-12 shrink-0 relative" style={{ height: `${HOURS.length * 48}px` }}>
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
          const dayBlocks = schedules
            .map((s) => ({ s, ...convertBlock(s, viewTz) }))
            .filter((b) => b.day === dayIdx);

          return (
            <div key={day} className="flex-1 flex flex-col">
              <div className="text-center text-xs font-medium text-gray-500 pb-1">{day}</div>
              <div
                className="relative border-l border-gray-100 cursor-pointer group"
                style={{ height: `${HOURS.length * 48}px` }}
                onClick={() =>
                  setAdding({ day: dayIdx, start: "09:00", duration: 60, label: "", timezone: viewTz })
                }
              >
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-gray-100"
                    style={{ top: `${((h - 6) / (HOURS.length - 1)) * 100}%` }}
                  />
                ))}

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <span className="text-xs text-primary font-medium bg-primary-light rounded px-2 py-0.5">+ Add</span>
                </div>

                {dayBlocks.map(({ s, startMins, endMins }) => {
                  const top = topPct(startMins);
                  const height = heightPct(startMins, endMins);
                  if (top < 0 || top > 100) return null;
                  const displayStart = minutesToTime(startMins);
                  const displayEnd = minutesToTime(endMins);
                  const blockTzLabel = TIMEZONES.find((t) => t.value === s.timezone)?.label ?? s.timezone;
                  return (
                    <div
                      key={s.id}
                      className="absolute left-0.5 right-0.5 rounded bg-primary text-white text-xs px-1 py-0.5 overflow-hidden z-10 group/block"
                      style={{ top: `${top}%`, height: `${Math.max(height, 4)}%` }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="truncate leading-tight">{s.label || slotLabel(displayStart, displayEnd)}</div>
                      <div className="text-primary-light/80 truncate" style={{ fontSize: "10px" }}>
                        {slotLabel(displayStart, displayEnd)}
                        {s.timezone !== viewTz && ` (${blockTzLabel})`}
                      </div>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="absolute top-0.5 right-0.5 opacity-0 group-hover/block:opacity-100 text-white/70 hover:text-white leading-none text-sm"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Showing times in <span className="font-medium">{viewTzLabel}</span>. Click any day column to add a block.
      </p>

      {/* Add block modal */}
      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-gray-800">Add time block — {DAYS[adding.day]}</h3>
              <button onClick={() => setAdding(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Timezone (your local time)</label>
                <select
                  value={adding.timezone}
                  onChange={(e) => setAdding((a) => a && ({ ...a, timezone: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-primary bg-background text-sm"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start time</label>
                <select
                  value={adding.start}
                  onChange={(e) => setAdding((a) => a && ({ ...a, start: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-primary bg-background text-sm"
                >
                  {Array.from({ length: 33 }, (_, i) => {
                    const mins = 360 + i * 30;
                    const t = minutesToTime(mins);
                    const [h, m] = t.split(":").map(Number);
                    const ampm = h < 12 ? "am" : "pm";
                    const hr = h % 12 || 12;
                    const label = m === 0 ? `${hr}:00 ${ampm}` : `${hr}:${m.toString().padStart(2, "0")} ${ampm}`;
                    return <option key={t} value={t}>{label}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Duration</label>
                <select
                  value={adding.duration}
                  onChange={(e) => setAdding((a) => a && ({ ...a, duration: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-primary bg-background text-sm"
                >
                  {SLOT_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d < 60 ? `${d} min` : d % 60 === 0 ? `${d / 60} hr` : `${Math.floor(d / 60)} hr ${d % 60} min`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Label (optional)</label>
                <input
                  value={adding.label}
                  onChange={(e) => setAdding((a) => a && ({ ...a, label: e.target.value }))}
                  placeholder="e.g. Zoom session, Prospecting…"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-primary bg-background text-sm"
                />
              </div>
              {error && <p className="text-sm text-stall">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setAdding(null)} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:border-gray-300">Cancel</button>
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Add block"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
