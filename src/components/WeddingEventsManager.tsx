"use client";

import { useState, useTransition } from "react";
import { CITIES } from "@/lib/cities";
import type { WeddingEventRow } from "@/lib/types";
import {
  addWeddingEvent,
  updateWeddingEvent,
  deleteWeddingEvent,
} from "@/actions/wedding";

const SUGGESTED_KINDS = [
  { kind: "ceremony", label: "Ceremony" },
  { kind: "reception", label: "Reception" },
  { kind: "dinner", label: "Dinner" },
  { kind: "shower", label: "Bridal Shower" },
  { kind: "party", label: "Party" },
  { kind: "brunch", label: "Brunch" },
] as const;

export function WeddingEventsManager({
  events: initialEvents,
  meId,
  meIsAdmin,
}: {
  events: WeddingEventRow[];
  meId: string;
  meIsAdmin: boolean;
}) {
  const [events, setEvents] = useState<WeddingEventRow[]>(initialEvents);
  const [editing, setEditing] = useState<string | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleQuickAdd(kind: string, title: string) {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("kind", kind);
      fd.set("title", title);
      const result = await addWeddingEvent(fd);
      if (result.error) {
        setError(result.error);
      } else if (result.event) {
        setEvents((prev) => [...prev, result.event!].sort((a, b) => a.sort_order - b.sort_order));
      }
    });
  }

  async function handleDelete(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteWeddingEvent(id);
      if (result.error) {
        setError(result.error);
      } else {
        setEvents((prev) => prev.filter((e) => e.id !== id));
        if (editing === id) setEditing(null);
      }
    });
  }

  async function handleUpdate(id: string, fd: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateWeddingEvent(id, fd);
      if (result.error) {
        setError(result.error);
      } else if (result.event) {
        setEvents((prev) =>
          prev.map((e) => (e.id === id ? result.event! : e)),
        );
        setEditing(null);
      }
    });
  }

  const existingKinds = new Set(events.map((e) => e.kind));

  return (
    <div className="space-y-6">
      {/* Quick-add chips */}
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wider text-stone-500 font-medium">
          Quick add
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_KINDS.map(({ kind, label }) => {
            const alreadyAdded = existingKinds.has(kind);
            return (
              <button
                key={kind}
                onClick={() => !alreadyAdded && handleQuickAdd(kind, label)}
                disabled={alreadyAdded || isPending}
                className={
                  alreadyAdded
                    ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 cursor-default"
                    : "inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100 hover:border-stone-300 transition disabled:opacity-50 cursor-pointer"
                }
              >
                {alreadyAdded ? "✓ " : "+ "}
                {label}
              </button>
            );
          })}
          <button
            onClick={() => setShowCustomForm((v) => !v)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-stone-300 px-3 py-1 text-xs font-medium text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition"
          >
            + Custom
          </button>
        </div>
      </div>

      {/* Custom add form */}
      {showCustomForm && (
        <CustomAddForm
          onAdd={async (fd) => {
            setError(null);
            startTransition(async () => {
              const result = await addWeddingEvent(fd);
              if (result.error) {
                setError(result.error);
              } else if (result.event) {
                setEvents((prev) =>
                  [...prev, result.event!].sort(
                    (a, b) => a.sort_order - b.sort_order,
                  ),
                );
                setShowCustomForm(false);
              }
            });
          }}
          onCancel={() => setShowCustomForm(false)}
          isPending={isPending}
        />
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Events list */}
      {events.length === 0 ? (
        <div className="text-sm text-stone-400 italic">
          No events yet. Use quick-add or custom to create some.
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) =>
            editing === event.id ? (
              <EventEditRow
                key={event.id}
                event={event}
                onSave={(fd) => handleUpdate(event.id, fd)}
                onCancel={() => setEditing(null)}
                isPending={isPending}
              />
            ) : (
              <EventRow
                key={event.id}
                event={event}
                canEdit={event.created_by === meId || meIsAdmin}
                onEdit={() => setEditing(event.id)}
                onDelete={() => handleDelete(event.id)}
                isPending={isPending}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function EventRow({
  event,
  canEdit,
  onEdit,
  onDelete,
  isPending,
}: {
  event: WeddingEventRow;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const city = CITIES.find((c) => c.id === event.location);
  return (
    <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">
            {event.kind}
          </span>
          <span className="font-medium text-stone-900">{event.title}</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-stone-500">
          {city && (
            <span className="rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 text-[10px] font-medium">
              {city.label}
            </span>
          )}
          {event.event_date && (
            <span>{event.event_date}{event.event_time ? ` at ${event.event_time}` : ""}</span>
          )}
          {event.notes && <span className="italic">{event.notes}</span>}
        </div>
      </div>
      {canEdit && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            disabled={isPending}
            className="rounded px-2 py-1 text-xs text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition disabled:opacity-50"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            disabled={isPending}
            className="rounded px-2 py-1 text-xs text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function EventEditRow({
  event,
  onSave,
  onCancel,
  isPending,
}: {
  event: WeddingEventRow;
  onSave: (fd: FormData) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <form
      className="rounded-xl border border-emerald-300 bg-emerald-50/30 px-4 py-3 space-y-3"
      action={(fd) => onSave(fd)}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-stone-500 font-medium block mb-1">
            Title
          </label>
          <input
            name="title"
            defaultValue={event.title}
            required
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-stone-500 font-medium block mb-1">
            Location
          </label>
          <select
            name="location"
            defaultValue={event.location ?? ""}
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            <option value="">— none —</option>
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-stone-500 font-medium block mb-1">
            Date
          </label>
          <input
            name="event_date"
            type="date"
            defaultValue={event.event_date ?? ""}
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-stone-500 font-medium block mb-1">
            Time
          </label>
          <input
            name="event_time"
            type="time"
            defaultValue={event.event_time ?? ""}
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-stone-500 font-medium block mb-1">
          Notes
        </label>
        <textarea
          name="notes"
          defaultValue={event.notes ?? ""}
          rows={2}
          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-lg px-3 py-1.5 text-sm text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 transition disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </form>
  );
}

function CustomAddForm({
  onAdd,
  onCancel,
  isPending,
}: {
  onAdd: (fd: FormData) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <form
      className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 space-y-3"
      action={(fd) => onAdd(fd)}
    >
      <div className="text-xs uppercase tracking-wider text-stone-500 font-medium">
        Add custom event
      </div>
      <input type="hidden" name="kind" value="custom" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-stone-500 font-medium block mb-1">
            Title *
          </label>
          <input
            name="title"
            required
            placeholder="e.g. After-party"
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-stone-500 font-medium block mb-1">
            Location
          </label>
          <select
            name="location"
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            <option value="">— none —</option>
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-stone-500 font-medium block mb-1">
            Date
          </label>
          <input
            name="event_date"
            type="date"
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-stone-500 font-medium block mb-1">
            Time
          </label>
          <input
            name="event_time"
            type="time"
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-stone-500 font-medium block mb-1">
          Notes
        </label>
        <textarea
          name="notes"
          rows={2}
          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-lg px-3 py-1.5 text-sm text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 transition disabled:opacity-50"
        >
          Add Event
        </button>
      </div>
    </form>
  );
}
