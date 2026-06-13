"use client";

import { useEffect, useState, useTransition } from "react";
import { CITIES } from "@/lib/cities";
import type { CityId } from "@/lib/cities";
import { setPreferredCities } from "@/actions/ratings";
import { cn } from "@/lib/utils";

export function PreferredCitiesInput({
  date,
  initial,
}: {
  date: string;
  initial: CityId[];
}) {
  const [selected, setSelected] = useState<Set<CityId>>(new Set(initial));
  // Sync local state when server revalidates (same pattern as StarRatingInput).
  useEffect(() => setSelected(new Set(initial)), [initial]);
  const [, startTransition] = useTransition();

  function toggle(id: CityId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      const arr = Array.from(next);
      startTransition(() => {
        setPreferredCities(date, arr).catch(console.error);
      });
      return next;
    });
  }

  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wider text-stone-500 font-medium">
        Preferred locations
      </div>
      <p className="text-xs text-stone-400">
        Which cities would work for a wedding on this date? Select any, or none.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {CITIES.map((c) => {
          const on = selected.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(c.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                on
                  ? "border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50",
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
