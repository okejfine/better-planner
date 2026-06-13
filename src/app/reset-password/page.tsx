"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type State =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!password.trim()) {
      setState({ kind: "error", message: "Enter a new password." });
      return;
    }
    if (password !== confirmPassword) {
      setState({ kind: "error", message: "Passwords do not match." });
      return;
    }

    setState({ kind: "saving" });
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: password.trim(),
    });

    if (error) {
      setState({
        kind: "error",
        message:
          error.message ??
          "Could not reset password. Open this page from the email reset link.",
      });
      return;
    }
    setState({ kind: "success" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-serif tracking-tight text-stone-900">
          Reset password
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Set a new password for your account.
        </p>

        {state.kind === "success" ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Password updated. You can sign in now.
            </div>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-lg bg-stone-900 py-2 text-sm font-medium text-white hover:bg-stone-800 transition"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <label className="block">
              <span className="block text-xs font-medium uppercase tracking-wider text-stone-500">
                New password
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-stone-900 outline-none focus:border-stone-400"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium uppercase tracking-wider text-stone-500">
                Confirm password
              </span>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-stone-900 outline-none focus:border-stone-400"
              />
            </label>
            {state.kind === "error" && (
              <div className="text-sm text-rose-600">{state.message}</div>
            )}
            <button
              type="submit"
              disabled={state.kind === "saving"}
              className="w-full rounded-lg bg-stone-900 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-60"
            >
              {state.kind === "saving" ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
