"use client";

import { useState, useTransition } from "react";
import { editCustomEvent, deleteCustomEvent } from "@/actions/events";
import { EventBar } from "@/components/EventBar";
import type { EventRow } from "@/lib/types";

export function CustomEventItem({
  event,
  ownedByMe,
}: {
  event: EventRow;
  ownedByMe: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <EventBar kind={event.kind} title={event.title} size="md" />
          {event.description && (
            <div className="text-sm text-stone-600 mt-1.5 whitespace-pre-wrap">
              {event.description}
            </div>
          )}
        </div>
        {ownedByMe && (
          <div className="flex items-center gap-3 shrink-0 pt-1">
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setError(null);
                setTitle(event.title);
                setDescription(event.description ?? "");
              }}
              className="text-xs text-stone-500 hover:text-stone-900"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() =>
                startTransition(() => {
                  deleteCustomEvent(event.id, event.date).catch((err) =>
                    setError(err.message ?? "Couldn't remove."),
                  );
                })
              }
              className="text-xs text-stone-400 hover:text-rose-600"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = title.trim();
        if (!t) {
          setError("Title can't be empty.");
          return;
        }
        setError(null);
        startTransition(() => {
          editCustomEvent(event.id, event.date, t, description.trim() || undefined)
            .then(() => setEditing(false))
            .catch((err) => setError(err.message ?? "Couldn't save."));
        });
      }}
      className="rounded-xl border border-stone-200 bg-white p-4 space-y-3"
    >
      <div className="flex items-baseline justify-between">
        <div className="text-xs uppercase tracking-wider text-stone-500 font-medium">
          Edit event
        </div>
        <button
          type="button"
          onClick={() => setEditing(false)}
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
        maxLength={60}
        className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:border-stone-400"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        maxLength={280}
        placeholder="Note (optional)"
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
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
