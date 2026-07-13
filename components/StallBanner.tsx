import Link from "next/link";
import { ComputedAgent } from "@/lib/computed";

export default function StallBanner({ agents }: { agents: ComputedAgent[] }) {
  const stalled = agents.filter((a) => a.stall);
  if (stalled.length === 0) return null;

  return (
    <div className="rounded-xl bg-stall-light border border-stall/30 p-4 mb-6">
      <p className="font-semibold text-stall mb-2">Needs follow-up</p>
      <ul className="space-y-1">
        {stalled.map((a) => (
          <li key={a.agent.id}>
            <Link
              href={`/dashboard/${a.agent.id}`}
              className="text-sm text-stall hover:underline"
            >
              <span className="font-medium">{a.agent.name}</span> — {a.stall!.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
