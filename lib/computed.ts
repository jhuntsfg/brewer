import { computeFunnelStage } from "./funnel";
import { computeProgress } from "./funnel";
import { computeStall } from "./stall";
import { AgentFull } from "./types";

export type ComputedAgent = AgentFull & {
  stage: string;
  progress: number;
  stall: { label: string } | null;
};

export function computeAgent(full: AgentFull, today: Date = new Date()): ComputedAgent {
  const stage = computeFunnelStage(full.agent, full.checks, full.dates);
  const progress = computeProgress(full.agent, full.checks);
  const stall = computeStall(full.agent, full.checks, full.dates, today);
  return { ...full, stage, progress, stall };
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
