"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { AGENCY } from "@/lib/agency";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"loading" | "set-password" | "error">("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Supabase puts the token in the URL hash; exchangeCodeForSession / getSession
    // processes it automatically when the page loads.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        // Check if this is an invite flow (user has no password yet)
        const hash = window.location.hash;
        if (hash.includes("type=invite") || hash.includes("type=recovery")) {
          setMode("set-password");
        } else {
          router.replace("/dashboard");
        }
      } else {
        setMode("error");
      }
    });
  }, [router]);

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/dashboard");
  }

  if (mode === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-gray-400 text-sm">Setting up your account…</p>
      </div>
    );
  }

  if (mode === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Image src="/logo.png" alt={AGENCY.name} width={140} height={70} className="object-contain opacity-60" />
        <p className="text-gray-500 text-sm">This link has expired. Ask your admin to send a new invite.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Image src="/logo.png" alt={AGENCY.name} width={180} height={90} className="object-contain" />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-xl font-semibold text-center mb-1">Set your password</h1>
          <p className="text-sm text-gray-400 text-center mb-6">Choose a password to complete your account setup.</p>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">New password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-primary bg-background"
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirm password</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-primary bg-background"
              />
            </div>
            {error && <p className="text-sm text-stall">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-primary text-white font-medium py-2.5 hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Set password & continue"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">{AGENCY.name} · Agent Onboarding</p>
      </div>
    </div>
  );
}
