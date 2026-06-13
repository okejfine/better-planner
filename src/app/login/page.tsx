"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type FormState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string };

type LoginMode = "magic_link" | "password";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<LoginMode>("magic_link");
  const [state, setState] = useState<FormState>({ kind: "idle" });

  async function handleResetPassword() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setState({
        kind: "error",
        message: "Enter your email first, then click reset password.",
      });
      return;
    }
    const supabase = createClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${siteUrl}/reset-password`,
    });
    if (error) {
      setState({ kind: "error", message: error.message });
      return;
    }
    setState({
      kind: "sent",
      email: normalizedEmail,
    });
  }

  useEffect(() => {
    const parseSupabaseError = (params: URLSearchParams) => {
      const code = params.get("error_code");
      const description = params.get("error_description");
      const error = params.get("error");

      if (!code && !description && !error) return null;

      if (code === "otp_expired") {
        return "That magic link is expired or already used. Please request a new one.";
      }
      if (error === "access_denied") {
        return "Sign-in was denied. Please request a fresh magic link and try again.";
      }
      if (error === "not_allowed") {
        return "This email is not allowlisted for this planner.";
      }
      if (description) {
        return description;
      }
      return "Sign-in failed. Please request a new magic link.";
    };

    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hash);
    const queryParams = new URLSearchParams(window.location.search);
    const message =
      parseSupabaseError(hashParams) ?? parseSupabaseError(queryParams);

    if (message) {
      setState({ kind: "error", message });
      // Clear error params/hash so refresh doesn't keep stale auth errors.
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;
    if (mode === "magic_link" && !name.trim()) return;
    if (mode === "password" && !password.trim()) return;

    setState({ kind: "sending" });
    const supabase = createClient();
    const normalizedEmail = email.trim().toLowerCase();

    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password.trim(),
      });

      if (error) {
        setState({
          kind: "error",
          message:
            error.message ??
            "Could not sign in with password. Check your credentials.",
        });
        return;
      }
      // Middleware will redirect signed-in users off /login.
      // Use replace so /login is not left in browser history (otherwise
      // pressing Back from the calendar lands on the sign-in screen).
      window.location.replace("/");
      return;
    }

    const response = await fetch("/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: normalizedEmail,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!response.ok) {
      setState({
        kind: "error",
        message: payload.error ?? "Unable to send magic link right now.",
      });
      return;
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
        data: { display_name: name.trim() },
      },
    });

    if (error) {
      const lower = error.message.toLowerCase();
      const rateLimited =
        lower.includes("rate limit") || lower.includes("over_email_send_rate_limit");
      setState({
        kind: "error",
        message: rateLimited
          ? "Supabase email rate limit reached. Wait a bit and request a new magic link."
          : error.message,
      });
      return;
    }

    setState({ kind: "sent", email: normalizedEmail });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="text-3xl font-serif tracking-tight text-stone-900">
            Better Planner
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
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-stone-200 p-1 bg-stone-50">
              <button
                type="button"
                onClick={() => setMode("magic_link")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  mode === "magic_link"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                Magic link
              </button>
              <button
                type="button"
                onClick={() => setMode("password")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  mode === "password"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                Password
              </button>
            </div>

            {mode === "magic_link" && (
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
            )}
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
            {mode === "password" && (
              <label className="block">
                <span className="block text-xs font-medium uppercase tracking-wider text-stone-500">
                  Password
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-stone-900 outline-none focus:border-stone-400"
                />
              </label>
            )}
            <button
              type="submit"
              disabled={state.kind === "sending"}
              className="w-full rounded-lg bg-stone-900 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-60"
            >
              {state.kind === "sending"
                ? mode === "password"
                  ? "Signing in…"
                  : "Sending magic link…"
                : mode === "password"
                  ? "Sign in with password"
                  : "Send magic link"}
            </button>
            {mode === "password" && (
              <button
                type="button"
                onClick={handleResetPassword}
                className="w-full rounded-lg border border-stone-300 bg-white py-2 text-sm font-medium text-stone-700 hover:border-stone-400 hover:text-stone-900 transition"
              >
                Reset password
              </button>
            )}
            {state.kind === "error" && (
              <div className="text-sm text-rose-600">{state.message}</div>
            )}
            {mode === "magic_link" ? (
              <p className="text-xs text-stone-400 text-center">
                We&rsquo;ll email you a one-tap sign-in link. No password.
              </p>
            ) : (
              <p className="text-xs text-stone-400 text-center">
                Use your existing password credentials.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
