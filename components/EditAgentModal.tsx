"use client";

import { useState } from "react";
import { Agent } from "@/lib/types";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

export default function EditAgentModal({
  agent,
  onClose,
  onSaved,
}: {
  agent: Agent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(agent.name);
  const [upline, setUpline] = useState(agent.upline ?? "");
  const [startDate, setStartDate] = useState(agent.start_date);
  const [type, setType] = useState<"licensed" | "unlicensed">(agent.type);
  const [phone, setPhone] = useState(agent.phone ?? "");
  const [email, setEmail] = useState(agent.email ?? "");
  const [state, setState] = useState(agent.state ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/admin/agents/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, upline, start_date: startDate, type, phone, email, state }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save changes");
      return;
    }
    onSaved();
  }

  const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-primary bg-background text-sm";

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Edit agent</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Full name <span className="text-stall">*</span></label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 000-0000" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">State</label>
              <select value={state} onChange={(e) => setState(e.target.value)} className={inputClass}>
                <option value="">— select —</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type <span className="text-stall">*</span></label>
              <select value={type} onChange={(e) => setType(e.target.value as "licensed" | "unlicensed")} className={inputClass}>
                <option value="unlicensed">Unlicensed</option>
                <option value="licensed">Licensed</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Upline</label>
            <input value={upline} onChange={(e) => setUpline(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
          </div>
          {error && <p className="text-sm text-stall">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-dark disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
