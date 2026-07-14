"use client";

import { useState } from "react";
import { STEP_GROUPS, stepsForAgent } from "@/lib/steps";
import { AgentType, ChecksMap } from "@/lib/types";

export default function Checklist({
  agentType,
  checks,
  onToggle,
  isAdmin,
}: {
  agentType: AgentType;
  checks: ChecksMap;
  onToggle: (stepId: string, checked: boolean) => void;
  isAdmin: boolean;
}) {
  const steps = stepsForAgent(agentType);

  const firstIncompleteGroup = STEP_GROUPS.find((group) => {
    const groupSteps = steps.filter((s) => s.group === group);
    return groupSteps.length > 0 && groupSteps.some((s) => !checks[s.id]?.checked);
  });

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(firstIncompleteGroup ? [firstIncompleteGroup] : [])
  );

  function toggleGroup(group: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {STEP_GROUPS.map((group) => {
        const groupSteps = steps.filter((s) => s.group === group);
        if (groupSteps.length === 0) return null;
        const done = groupSteps.filter((s) => checks[s.id]?.checked).length;
        const complete = done === groupSteps.length;
        const isOpen = openGroups.has(group);

        return (
          <div key={group} className="rounded-xl border border-primary/20 overflow-hidden bg-white">
            <button
              onClick={() => toggleGroup(group)}
              className="w-full flex items-center justify-between px-4 py-3 bg-primary hover:bg-primary-dark transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  {group}
                </span>
                {complete && (
                  <span className="text-xs bg-white/20 text-white rounded-full px-2 py-0.5 font-medium">
                    Complete
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/70">{done}/{groupSteps.length}</span>
                <span className="text-white/70 text-sm">{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>

            {isOpen && (
              <div className="px-3 pb-3 space-y-1.5 pt-3">
                {groupSteps.map((step) => {
                  const check = checks[step.id];
                  const checked = !!check?.checked;
                  const lockedForAgent = !isAdmin && checked && check?.checked_by === "admin";
                  return (
                    <label
                      key={step.id}
                      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                        checked
                          ? "bg-primary-light border-primary/30"
                          : "bg-background border-gray-100 hover:border-gray-200"
                      } ${lockedForAgent ? "cursor-default opacity-70" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={lockedForAgent}
                        onChange={(e) => onToggle(step.id, e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-[#637777] disabled:opacity-50 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${checked ? "strike" : ""}`}>{step.name}</p>
                        {step.note && <p className="text-xs text-gray-400 mt-0.5">{step.note}</p>}
                        {step.links && step.links.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {step.links.map((l) => (
                              <a
                                key={l.url}
                                href={l.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs font-medium text-primary border border-primary/40 rounded-full px-2.5 py-0.5 hover:bg-primary-light transition-colors"
                              >
                                {l.label} ↗
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
