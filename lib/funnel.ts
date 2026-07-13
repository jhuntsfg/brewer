import { stepsForAgent } from "./steps";
import { Agent, AgentDates, ChecksMap } from "./types";

export const FUNNEL_STAGES_UNLICENSED = [
  "Not started",
  "Started",
  "Application submitted",
  "In Leake Training",
  "Course complete",
  "Exam scheduled",
  "Passed exam",
  "License received",
  "AML / SureLC / E&O in progress",
  "Ready for contracts",
  "Contracts sent",
  "Wrote first business",
] as const;

export const FUNNEL_STAGES_LICENSED = [
  "Not started",
  "Started",
  "Application submitted",
  "In Leake Training",
  "Licensed — starting contracting",
  "AML / SureLC / E&O in progress",
  "Ready for contracts",
  "Contracts sent",
  "Wrote first business",
] as const;

export type FunnelStage =
  | (typeof FUNNEL_STAGES_UNLICENSED)[number]
  | (typeof FUNNEL_STAGES_LICENSED)[number];

function isChecked(checks: ChecksMap, id: string) {
  return !!checks[id]?.checked;
}

export function funnelStagesFor(type: "licensed" | "unlicensed") {
  return type === "licensed" ? FUNNEL_STAGES_LICENSED : FUNNEL_STAGES_UNLICENSED;
}

export function computeFunnelStage(
  agent: Agent,
  checks: ChecksMap,
  dates: AgentDates
): FunnelStage {
  const aml = isChecked(checks, "10");
  const surelc = isChecked(checks, "12");
  const eo = isChecked(checks, "13");
  const allThree = aml && surelc && eo;
  const anyOfThree = aml || surelc || eo;

  if (dates.contracts_sent_at && isChecked(checks, "16")) return "Wrote first business";
  if (isChecked(checks, "16")) return "Wrote first business";
  if (dates.contracts_sent_at) return "Contracts sent";
  if (allThree) return "Ready for contracts";

  if (agent.type === "licensed") {
    if (anyOfThree) return "AML / SureLC / E&O in progress";
    if (isChecked(checks, "7")) return "Licensed — starting contracting";
    if (isChecked(checks, "leake")) return "In Leake Training";
    if (isChecked(checks, "7")) return "Application submitted";
    if (isChecked(checks, "1")) return "Started";
    return "Not started";
  }

  // unlicensed
  if (anyOfThree) return "AML / SureLC / E&O in progress";
  if (isChecked(checks, "license_received")) return "License received";
  if (isChecked(checks, "2")) return "Passed exam";
  if (dates.exam_date) return "Exam scheduled";
  if (isChecked(checks, "course_done")) return "Course complete";
  if (isChecked(checks, "leake")) return "In Leake Training";
  if (isChecked(checks, "7")) return "Application submitted";
  if (isChecked(checks, "1")) return "Started";
  return "Not started";
}

export const ALL_STAGES_ORDER: FunnelStage[] = [
  "Not started",
  "Started",
  "Application submitted",
  "In Leake Training",
  "Course complete",
  "Exam scheduled",
  "Passed exam",
  "License received",
  "Licensed — starting contracting",
  "AML / SureLC / E&O in progress",
  "Ready for contracts",
  "Contracts sent",
  "Wrote first business",
];

export function stageRank(stage: string): number {
  const idx = ALL_STAGES_ORDER.indexOf(stage as FunnelStage);
  return idx === -1 ? 0 : idx;
}

export function computeProgress(
  agent: Agent,
  checks: ChecksMap
): number {
  const steps = stepsForAgent(agent.type);
  if (steps.length === 0) return 0;
  const done = steps.filter((s) => isChecked(checks, s.id)).length;
  return Math.round((done / steps.length) * 100);
}
