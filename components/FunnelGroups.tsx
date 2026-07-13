import Link from "next/link";
import { ComputedAgent } from "@/lib/computed";
import { stageRank } from "@/lib/funnel";
import { SortKey } from "@/app/dashboard/page";
import ProgressBar from "./ProgressBar";
import StallPill from "./StallPill";
import Avatar from "./Avatar";

function AgentCard({ a }: { a: ComputedAgent }) {
  return (
    <Link
      href={`/dashboard/${a.agent.id}`}
      className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition flex flex-col gap-2"
    >
      <div className="flex items-center gap-3">
        <Avatar name={a.agent.name} stalled={!!a.stall} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm">{a.agent.name}</p>
            {a.stall && <StallPill label="stalled" />}
          </div>
          <p className="text-xs text-gray-400 capitalize">{a.agent.type}{a.agent.state ? ` · ${a.agent.state}` : ""}</p>
        </div>
      </div>
      <ProgressBar progress={a.progress} />
      <p className="text-xs text-gray-400">{a.progress}% · {a.stage}</p>
    </Link>
  );
}

export default function FunnelGroups({
  agents,
  sort,
}: {
  agents: ComputedAgent[];
  sort: SortKey;
}) {
  if (sort === "added") {
    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.map((a) => <AgentCard key={a.agent.id} a={a} />)}
        </div>
      </div>
    );
  }

  if (sort === "upline") {
    const groups = new Map<string, ComputedAgent[]>();
    for (const a of agents) {
      const key = a.agent.upline || "No upline";
      const list = groups.get(key) ?? [];
      list.push(a);
      groups.set(key, list);
    }
    const sortedKeys = Array.from(groups.keys()).sort((a, b) =>
      a === "No upline" ? 1 : b === "No upline" ? -1 : a.localeCompare(b)
    );
    return (
      <div className="space-y-6">
        {sortedKeys.map((key) => (
          <div key={key}>
            <h2 className="text-sm font-semibold text-gray-500 mb-2">
              {key} <span className="text-gray-400">({groups.get(key)!.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groups.get(key)!.map((a) => <AgentCard key={a.agent.id} a={a} />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default: funnel stage groups
  const groups = new Map<string, ComputedAgent[]>();
  for (const a of agents) {
    const list = groups.get(a.stage) ?? [];
    list.push(a);
    groups.set(a.stage, list);
  }
  const sortedStages = Array.from(groups.keys()).sort((x, y) => stageRank(y) - stageRank(x));

  return (
    <div className="space-y-6">
      {sortedStages.map((stage) => (
        <div key={stage}>
          <h2 className="text-sm font-semibold text-gray-500 mb-2">
            {stage} <span className="text-gray-400">({groups.get(stage)!.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {groups.get(stage)!.map((a) => <AgentCard key={a.agent.id} a={a} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
