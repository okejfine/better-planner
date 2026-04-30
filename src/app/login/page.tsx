"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type FormState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string };

export default function LoginPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>({ kind: "idle" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setState({ kind: "sending" });

    const supabase = createClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
        data: { display_name: name.trim() },
      },
    });

    if (error) {
      setState({ kind: "error", message: error.message });
      return;
    }
    setState({ kind: "sent", email: email.trim().toLowerCase() });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="text-3xl font-serif tracking-tight text-stone-900">
            Wedding Planner
          </div>
          <div className="mt-2 text-sm text-stone-500">
            Pick a date, together.
          </div>
        </div>

        {state.kind === "sent" ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
            <div className="text-base font-medium text-stone-900">
              Check your email
            </div>
            <p className="mt-2 text-sm text-stone-500">
              We sent a sign-in link to <span className="font-medium text-stone-700">{state.email}</span>.
              Click it to continue.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4"
          >
            <label className="block">
              <span className="block text-xs font-medium uppercase tracking-wider text-stone-500">
                Your name
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Adam"
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-stone-900 outline-none focus:border-stone-400"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium uppercase tracking-wider text-stone-500">
                Email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-stone-900 outline-none focus:border-stone-400"
              />
            </label>
            <button
              type="submit"
              disabled={state.kind === "sending"}
              className="w-full rounded-lg bg-stone-900 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-60"
            >
              {state.kind === "sending" ? "Sending magic link…" : "Send magic link"}
            </button>
            {state.kind === "error" && (
              <div className="text-sm text-rose-600">{state.message}</div>
            )}
            <p className="text-xs text-stone-400 text-center">
              We&rsquo;ll email you a one-tap sign-in link. No password.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
