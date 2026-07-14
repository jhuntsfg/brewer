"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import confetti from "canvas-confetti";
import { computeAgent, ComputedAgent } from "@/lib/computed";
import { AgentFull } from "@/lib/types";
import ProgressBar from "@/components/ProgressBar";
import Checklist from "@/components/Checklist";
import WeeklySchedule from "@/components/WeeklySchedule";
import { AgentSchedule } from "@/lib/schedules";
import { STEP_GROUPS, stepsForAgent } from "@/lib/steps";
import { AGENCY } from "@/lib/agency";

export default function AgentSelfPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<ComputedAgent | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [schedules, setSchedules] = useState<AgentSchedule[]>([]);

  async function load() {
    const res = await fetch(`/api/agent/${params.token}`);
    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    const full: AgentFull = await res.json();
    setData(computeAgent(full));
  }

  async function loadSchedules() {
    const res = await fetch(`/api/agent/${params.token}/schedule`);
    if (res.ok) {
      const { schedules: s } = await res.json();
      setSchedules(s);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    loadSchedules();
  }, []);

  async function toggleStep(stepId: string, checked: boolean) {
    const res = await fetch(`/api/agent/${params.token}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepId, checked }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Could not update step.");
    } else if (checked) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: AGENCY.confettiColors,
      });
    }
    load();
  }

  async function setExamDate(examDate: string | null) {
    await fetch(`/api/agent/${params.token}/exam-date`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examDate }),
    });
    load();
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Image src="/logo.png" alt={AGENCY.name} width={140} height={70} className="object-contain opacity-60" />
        <p className="text-gray-500 text-sm">This link isn&apos;t valid. Please check with your admin.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-gray-400 text-sm">Loading your checklist…</p>
      </div>
    );
  }

  const steps = stepsForAgent(data.agent.type);
  const totalDone = steps.filter((s) => data.checks[s.id]?.checked).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header banner */}
      <div className="bg-primary text-white">
        <div className="max-w-2xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-semibold text-sm">
              {data.agent.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
            </div>
            <div>
              <p className="font-semibold">{data.agent.name}</p>
              <p className="text-xs text-white/70 capitalize">{data.agent.type} agent</p>
            </div>
          </div>
          <div className="text-right">
            <Image
              src="/logo.png"
              alt={AGENCY.name}
              width={60}
              height={60}
              className="object-contain rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Progress strip */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-gray-700">Your progress</p>
              <p className="text-xs text-gray-400">{data.stage}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold text-primary">{data.progress}%</p>
              <p className="text-xs text-gray-400">{totalDone} of {steps.length} steps</p>
            </div>
          </div>
          <ProgressBar progress={data.progress} />
          {data.stall && (
            <div className="mt-3 rounded-lg bg-stall-light border border-stall/20 px-3 py-2 text-xs text-stall font-medium">
              Action needed: {data.stall.label}
            </div>
          )}
        </div>
      </div>

      {/* Exam date card (unlicensed only) */}
      {data.agent.type === "unlicensed" && (
        <div className="max-w-2xl mx-auto px-4 pt-5">
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm">State exam date</p>
              <p className="text-xs text-gray-400">Enter when your exam is scheduled</p>
            </div>
            <input
              type="date"
              value={data.dates.exam_date ?? ""}
              onChange={(e) => setExamDate(e.target.value || null)}
              className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-primary bg-background"
            />
          </div>
        </div>
      )}

      {/* Section progress summary */}
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-2">
        <div className="flex flex-wrap justify-center gap-2">
          {STEP_GROUPS.map((group) => {
            const groupSteps = steps.filter((s) => s.group === group);
            if (groupSteps.length === 0) return null;
            const done = groupSteps.filter((s) => data.checks[s.id]?.checked).length;
            const pct = Math.round((done / groupSteps.length) * 100);
            return (
              <div key={group} className="bg-primary rounded-xl p-3 text-center w-[calc(33%-0.375rem)] min-w-[120px]">
                <p className="text-lg font-semibold text-white">{pct}%</p>
                <p className="text-xs text-white/70 leading-tight">{group}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Checklist */}
      <div className="max-w-2xl mx-auto px-4 py-5">
        <Checklist
          agentType={data.agent.type}
          checks={data.checks}
          onToggle={toggleStep}
          isAdmin={false}
        />
      </div>

      {/* Work schedule */}
      <div className="max-w-2xl mx-auto px-4 pb-6">
        <h2 className="text-base font-semibold text-gray-700 mb-3">My work schedule</h2>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-3">Set your committed weekly work hours. Your admin can see all schedules on the master calendar.</p>
          <WeeklySchedule
            schedules={schedules}
            apiBase={`/api/agent/${params.token}/schedule`}
            onAdd={(s) => setSchedules((prev) => [...prev, s])}
            onDelete={(id) => setSchedules((prev) => prev.filter((s) => s.id !== id))}
          />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-10 text-center">
        <p className="text-xs text-gray-300">{AGENCY.name} · Onboarding Tracker</p>
      </div>
    </div>
  );
}
