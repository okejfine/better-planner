"use client";

import { useState, useTransition } from "react";
import { addCustomEvent } from "@/actions/events";

export function AddCustomEvent({ date }: { date: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setDescription("");
    setError(null);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-stone-500 hover:text-stone-900 underline-offset-4 hover:underline"
      >
        + Add an event for this day
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = title.trim();
        if (!t) {
          setError("Give it a short title.");
          return;
        }
        setError(null);
        startTransition(() => {
          addCustomEvent(date, t, description.trim() || undefined)
            .then(() => {
              reset();
              setOpen(false);
            })
            .catch((err) => setError(err.message ?? "Couldn't save."));
        });
      }}
      className="rounded-xl border border-stone-200 bg-white p-4 space-y-3"
    >
      <div className="flex items-baseline justify-between">
        <div className="text-xs uppercase tracking-wider text-stone-500 font-medium">
          New event
        </div>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="text-xs text-stone-400 hover:text-stone-700"
        >
          Cancel
        </button>
      </div>
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title — e.g. Family in town"
        maxLength={60}
        className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:border-stone-400"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Note (optional) — anything else you want others to know"
        rows={3}
        maxLength={280}
        className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:border-stone-400"
      />
      {error && <div className="text-sm text-rose-600">{error}</div>}
      <div className="flex items-center justify-end gap-2">
        <span className="text-[11px] text-stone-400 mr-auto tabular-nums">
          {title.length}/60 · {description.length}/280
        </span>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-stone-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save event"}
        </button>
      </div>
    </form>
  );
}
