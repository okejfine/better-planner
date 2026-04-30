"use client";

import { useEffect, useState, useTransition } from "react";
import { toggleShortlist, toggleVeto } from "@/actions/ratings";
import { cn } from "@/lib/utils";

export function VetoButton({
  date,
  initial,
}: {
  date: string;
  initial: boolean;
}) {
  const [on, setOn] = useState(initial);
  const [, startTransition] = useTransition();
  useEffect(() => setOn(initial), [initial]);
  return (
    <button
      type="button"
      onClick={() => {
        setOn(!on);
        startTransition(() => {
          toggleVeto(date).catch(console.error);
        });
      }}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
        on
          ? "bg-rose-500 border-rose-500 text-white"
          : "bg-white border-stone-300 text-stone-700 hover:border-rose-300 hover:text-rose-600",
      )}
    >
      {on ? "⛔ Vetoed" : "Veto this day"}
    </button>
  );
}

export function ShortlistButton({
  date,
  initial,
}: {
  date: string;
  initial: boolean;
}) {
  const [on, setOn] = useState(initial);
  const [, startTransition] = useTransition();
  useEffect(() => setOn(initial), [initial]);
  return (
    <button
      type="button"
      onClick={() => {
        setOn(!on);
        startTransition(() => {
          toggleShortlist(date).catch(console.error);
        });
      }}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
        on
          ? "bg-amber-400 border-amber-400 text-stone-900"
          : "bg-white border-stone-300 text-stone-700 hover:border-amber-300 hover:text-amber-700",
      )}
    >
      {on ? "★ Shortlisted" : "Add to shortlist"}
    </button>
  );
}
