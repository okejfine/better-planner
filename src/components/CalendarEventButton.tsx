"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { format } from "date-fns";
import { deleteCustomEvent } from "@/actions/events";
import { EventBar } from "@/components/EventBar";
import { fromIso } from "@/lib/dates";
import type { EventRow } from "@/lib/types";

export function CalendarEventButton({
  event,
  ownedByMe,
}: {
  event: EventRow;
  ownedByMe: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          // Sit above the day tile's navigation link overlay so a click on the
          // event opens this dialog instead of navigating to the day page.
          className="relative z-[2] block w-full text-left focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          <EventBar kind={event.kind} title={event.title} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-stone-900/30 backdrop-blur-sm" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,380px)] rounded-2xl bg-white shadow-2xl border border-stone-200 p-6 space-y-4 focus:outline-none">
          <div>
            <div className="text-xs uppercase tracking-widest text-stone-400">
              {format(fromIso(event.date), "EEEE · MMMM d")}
            </div>
            <Dialog.Title className="font-serif text-2xl tracking-tight text-stone-900 mt-1">
              {event.title}
            </Dialog.Title>
            {event.description ? (
              <Dialog.Description className="text-sm text-stone-600 mt-2 whitespace-pre-wrap">
                {event.description}
              </Dialog.Description>
            ) : (
              <Dialog.Description className="sr-only">
                Event details
              </Dialog.Description>
            )}
          </div>
          {error && <div className="text-sm text-rose-600">{error}</div>}
          <div className="flex items-center justify-between gap-2">
            {ownedByMe ? (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(() => {
                    deleteCustomEvent(event.id, event.date)
                      .then(() => setOpen(false))
                      .catch((err) =>
                        setError(err.message ?? "Couldn't delete event."),
                      );
                  })
                }
                className="rounded-lg bg-rose-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {pending ? "Deleting…" : "Delete event"}
              </button>
            ) : (
              <span className="text-xs text-stone-400">
                Only the person who added this can delete it.
              </span>
            )}
            <Dialog.Close asChild>
              <button
                type="button"
                className="text-sm text-stone-500 hover:text-stone-900 px-2 py-1.5"
              >
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
