"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ComputedAgent } from "@/lib/computed";
import { AGENCY } from "@/lib/agency";
import Avatar from "./Avatar";
import ProgressBar from "./ProgressBar";

export default function Sidebar({
  agents,
  activeAgentId,
  onAddAgent,
}: {
  agents: ComputedAgent[];
  activeAgentId?: string;
  onAddAgent: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = agents.filter((a) => {
    const q = query.toLowerCase();
    return (
      a.agent.name.toLowerCase().includes(q) ||
      (a.agent.phone ?? "").includes(q)
    );
  });

  return (
    <aside className="w-72 shrink-0 border-r border-gray-200 bg-white flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2 mb-3">
          <div className="relative h-8 w-28">
            <Image
              src="/logo.png"
              alt={AGENCY.name}
              fill
              className="object-contain object-left"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <span className="text-xs text-gray-400 font-medium ml-auto">Tracker</span>
        </Link>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search agents…"
          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-primary bg-background"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map((a) => (
          <Link
            key={a.agent.id}
            href={`/dashboard/${a.agent.id}`}
            className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-background transition-colors ${
              activeAgentId === a.agent.id ? "bg-primary-light border-l-2 border-l-primary" : ""
            }`}
          >
            <Avatar name={a.agent.name} stalled={!!a.stall} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{a.agent.name}</p>
              <p className="text-xs text-gray-500 truncate">{a.stage}</p>
              <div className="mt-1">
                <ProgressBar progress={a.progress} />
              </div>
            </div>
            <span className="text-xs text-gray-400">{a.progress}%</span>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 p-4">No agents found.</p>
        )}
      </div>
      <div className="p-4 border-t border-gray-100 space-y-2">
        <Link
          href="/dashboard/schedule"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-background transition-colors"
        >
          <span>📅</span> Master schedule
        </Link>
        <button
          onClick={onAddAgent}
          className="w-full rounded-lg bg-primary text-white font-medium py-2 text-sm hover:bg-primary-dark transition-colors"
        >
          + Add agent
        </button>
      </div>
    </aside>
  );
}
