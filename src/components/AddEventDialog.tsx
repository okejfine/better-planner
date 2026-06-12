"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { addCustomEvent } from "@/actions/events";
import { useTheme } from "@/components/theme/ThemeProvider";
import { fireRoseConfetti } from "@/lib/confetti";

export function AddEventDialog({
  defaultDate,
}: {
  defaultDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(defaultDate ?? "2026-07-01");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { theme } = useTheme();

  function reset() {
    setTitle("");
    setDescription("");
    setError(null);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const t = title.trim();
    if (!t) {
      setError("Give the event a short title.");
      return;
    }
    startTransition(() => {
      addCustomEvent(date, t, description.trim() || undefined)
        .then(() => {
          reset();
          setOpen(false);
          if (theme === "clang") fireRoseConfetti();
        })
        .catch((err) => setError(err.message ?? "Couldn't save."));
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-stone-800 transition"
        >
          <span aria-hidden>+</span> Add event
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-stone-900/30 backdrop-blur-sm" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,420px)] rounded-2xl bg-white shadow-2xl border border-stone-200 p-6 space-y-5 focus:outline-none">
          <div>
            <Dialog.Title className="font-serif text-2xl tracking-tight text-stone-900">
              Add event
            </Dialog.Title>
            <Dialog.Description className="text-sm text-stone-500 mt-0.5">
              Note something for any day in the wedding window.
            </Dialog.Description>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="block text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">
                Date
              </span>
              <input
                type="date"
                required
                min="2026-07-01"
                max="2026-10-31"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:border-stone-400"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">
                Title
              </span>
              <input
                type="text"
                required
                maxLength={60}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Family in town · Reception venue tour"
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:border-stone-400"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium uppercase tracking-wider text-stone-500 mb-1">
                Note <span className="text-stone-400 normal-case">(optional)</span>
              </span>
              <textarea
                rows={2}
                maxLength={280}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any extra context"
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:border-stone-400"
              />
            </label>
            {error && <div className="text-sm text-rose-600">{error}</div>}
            <div className="flex items-center justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="text-sm text-stone-500 hover:text-stone-900 px-2 py-1.5"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-stone-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-60"
              >
                {pending ? "Saving…" : "Add event"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
