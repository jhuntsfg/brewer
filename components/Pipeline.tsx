"use client";

import { AgentDates, AgentType, ChecksMap } from "@/lib/types";

type PipelineItem =
  | { kind: "step"; stepId: string; label: string }
  | { kind: "examDate"; label: string }
  | { kind: "parallel"; label: string }
  | { kind: "computed"; label: string; done: boolean };

function isChecked(checks: ChecksMap, id: string) {
  return !!checks[id]?.checked;
}

export default function Pipeline({
  agentType,
  checks,
  dates,
  onToggleStep,
  onSetExamDate,
}: {
  agentType: AgentType;
  checks: ChecksMap;
  dates: AgentDates;
  onToggleStep: (stepId: string, checked: boolean) => void;
  onSetExamDate: (date: string | null) => void;
}) {
  const aml = isChecked(checks, "10");
  const surelc = isChecked(checks, "12");
  const eo = isChecked(checks, "13");
  const allThree = aml && surelc && eo;

  const items: PipelineItem[] =
    agentType === "unlicensed"
      ? [
          { kind: "step", stepId: "1", label: "Started" },
          { kind: "step", stepId: "7", label: "Application submitted" },
          { kind: "step", stepId: "leake", label: "In Leake Training" },
          { kind: "step", stepId: "course_done", label: "Course complete" },
          { kind: "examDate", label: "Exam scheduled" },
          { kind: "step", stepId: "2", label: "Passed exam" },
          { kind: "step", stepId: "license_received", label: "License received" },
          { kind: "parallel", label: "AML / SureLC / E&O in progress" },
          { kind: "computed", label: "Ready for contracts", done: allThree },
        ]
      : [
          { kind: "step", stepId: "1", label: "Started" },
          { kind: "step", stepId: "7", label: "Application submitted / Licensed — starting contracting" },
          { kind: "step", stepId: "leake", label: "In Leake Training" },
          { kind: "parallel", label: "AML / SureLC / E&O in progress" },
          { kind: "computed", label: "Ready for contracts", done: allThree },
        ];

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        if (item.kind === "step") {
          const done = isChecked(checks, item.stepId);
          return (
            <div
              key={i}
              className={`rounded-xl border p-4 flex items-center justify-between ${
                done ? "bg-primary-light border-primary" : "bg-white border-gray-100"
              }`}
            >
              <p className={`font-medium ${done ? "text-primary" : ""}`}>{item.label}</p>
              <button
                onClick={() => onToggleStep(item.stepId, !done)}
                className="text-xs font-medium rounded-full px-3 py-1 border border-primary text-primary hover:bg-primary-light"
              >
                {done ? "Undo" : "Mark done"}
              </button>
            </div>
          );
        }
        if (item.kind === "examDate") {
          return (
            <div key={i} className="rounded-xl border bg-white border-gray-100 p-4 flex items-center justify-between gap-4">
              <p className="font-medium">{item.label}</p>
              <input
                type="date"
                value={dates.exam_date ?? ""}
                onChange={(e) => onSetExamDate(e.target.value || null)}
                className="rounded-lg border border-gray-200 px-2 py-1 text-sm outline-none focus:border-primary"
              />
            </div>
          );
        }
        if (item.kind === "parallel") {
          return (
            <div key={i} className="rounded-xl border border-gray-100 bg-white p-4">
              <p className="font-medium mb-1">{item.label}</p>
              <p className="text-xs text-gray-400 mb-3">Must complete all three to unlock contracts</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { id: "10", label: "AML course" },
                  { id: "12", label: "SureLC account" },
                  { id: "13", label: "E&O Insurance" },
                ].map((p) => {
                  const done = isChecked(checks, p.id);
                  return (
                    <div
                      key={p.id}
                      className={`rounded-lg border p-3 flex flex-col items-start gap-2 ${
                        done ? "bg-primary-light border-primary" : "border-gray-100"
                      }`}
                    >
                      <p className={`text-sm font-medium ${done ? "text-primary" : ""}`}>{p.label}</p>
                      <button
                        onClick={() => onToggleStep(p.id, !done)}
                        className="text-xs font-medium rounded-full px-3 py-1 border border-primary text-primary hover:bg-primary-light"
                      >
                        {done ? "Undo" : "Mark done"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }
        return (
          <div
            key={i}
            className={`rounded-xl border p-4 ${
              item.done ? "bg-primary-light border-primary" : "bg-white border-gray-100"
            }`}
          >
            <p className={`font-medium ${item.done ? "text-primary" : ""}`}>{item.label}</p>
          </div>
        );
      })}
    </div>
  );
}
