import { ComputedAgent } from "@/lib/computed";

export default function MetricsRow({ agents }: { agents: ComputedAgent[] }) {
  const total = agents.length;
  const stalled = agents.filter((a) => a.stall).length;
  const awaitingFirstApp = agents.filter(
    (a) => a.dates.contracts_sent_at && !a.checks["16"]?.checked
  ).length;
  const writingBusiness = agents.filter((a) => a.checks["16"]?.checked).length;

  const metrics = [
    { label: "Total agents", value: total },
    { label: "Stalled", value: stalled, highlight: true },
    { label: "Awaiting first app", value: awaitingFirstApp },
    { label: "Writing business", value: writingBusiness },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {metrics.map((m) => (
        <div
          key={m.label}
          className={`rounded-xl border p-4 ${
            m.highlight ? "bg-stall-light border-stall/30" : "bg-white border-gray-100"
          }`}
        >
          <p className={`text-2xl font-semibold ${m.highlight ? "text-stall" : ""}`}>{m.value}</p>
          <p className="text-sm text-gray-500">{m.label}</p>
        </div>
      ))}
    </div>
  );
}
