import { Agent, AgentDates, ChecksMap } from "./types";

export type StallReason = {
  label: string;
};

function isChecked(checks: ChecksMap, id: string) {
  return !!checks[id]?.checked;
}

function daysBetween(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Stall rules are evaluated in priority order; the first match wins.
 */
export function computeStall(
  agent: Agent,
  checks: ChecksMap,
  dates: AgentDates,
  today: Date = new Date()
): StallReason | null {
  if (agent.stall_snoozed_until) {
    const snoozedUntil = new Date(agent.stall_snoozed_until);
    if (today < snoozedUntil) return null;
  }
  const aml = isChecked(checks, "10");
  const surelc = isChecked(checks, "12");
  const eo = isChecked(checks, "13");

  if (agent.type === "unlicensed" && isChecked(checks, "course_done") && !dates.exam_date) {
    return { label: "Finished course — exam not scheduled" };
  }

  const licensedReadyForAmlBlock =
    isChecked(checks, "license_received") || (agent.type === "licensed" && isChecked(checks, "7"));
  if (licensedReadyForAmlBlock && !aml && !surelc && !eo) {
    return { label: "Licensed — AML/SureLC/E&O not started" };
  }

  if (agent.type === "unlicensed" && dates.exam_date && !isChecked(checks, "2")) {
    const examDate = new Date(dates.exam_date);
    if (daysBetween(examDate, today) >= 2) {
      return { label: "Exam date passed — not marked passed" };
    }
  }

  if (
    agent.type === "unlicensed" &&
    isChecked(checks, "2") &&
    !isChecked(checks, "license_received")
  ) {
    const checkedAt = checks["2"]?.checked_at;
    if (checkedAt && daysBetween(new Date(checkedAt), today) >= 2) {
      return { label: "Passed exam — license not received" };
    }
  }

  if (dates.contracts_sent_at && !isChecked(checks, "16")) {
    if (daysBetween(new Date(dates.contracts_sent_at), today) >= 2) {
      return { label: "Contracts sent — no first app" };
    }
  }

  if (
    agent.type === "unlicensed" &&
    isChecked(checks, "1") &&
    !isChecked(checks, "course_done")
  ) {
    if (daysBetween(new Date(agent.start_date), today) >= 7) {
      return { label: "Started — course not finished" };
    }
  }

  return null;
}
