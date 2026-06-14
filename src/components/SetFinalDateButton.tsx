"use client";

import { useTransition } from "react";
import { setFinalDate } from "@/actions/wedding";

export function SetFinalDateButton({
  date,
  isFinalDate,
}: {
  date: string;
  isFinalDate: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(() => {
      setFinalDate(isFinalDate ? null : date).catch(console.error);
    });
  }

  if (isFinalDate) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
          💍 Final wedding date
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={handleClick}
          className="text-xs text-stone-400 hover:text-rose-600 transition disabled:opacity-50"
        >
          {pending ? "Removing…" : "Remove"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-700 hover:border-emerald-400 hover:text-emerald-800 hover:bg-emerald-50 transition disabled:opacity-50"
    >
      {pending ? "Setting…" : "💍 Set as final date"}
    </button>
  );
}
