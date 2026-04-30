"use client";

import { useEffect, useState, useTransition } from "react";
import { setStars } from "@/actions/ratings";
import { cn } from "@/lib/utils";

export function StarRatingInput({
  date,
  initial,
}: {
  date: string;
  initial: number | null;
}) {
  const [value, setValue] = useState<number | null>(initial);
  const [hover, setHover] = useState<number | null>(null);
  // Sync local state when server-rendered prop changes (e.g., revalidation
  // after another collaborator updates this day).
  useEffect(() => setValue(initial), [initial]);
  const [, startTransition] = useTransition();

  const display = hover ?? value ?? 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={() => {
              const next = value === i ? null : i;
              setValue(next);
              startTransition(() => {
                setStars(date, next).catch(console.error);
              });
            }}
            className={cn(
              "h-7 w-7 rounded-md flex items-center justify-center transition",
              i <= display
                ? "text-amber-400 hover:text-amber-500"
                : "text-stone-300 hover:text-stone-400",
            )}
            aria-label={`${i} star`}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 1.5l2.6 5.3 5.9.86-4.25 4.14 1 5.85L10 14.8l-5.25 2.85 1-5.85L1.5 7.66l5.9-.86L10 1.5z" />
            </svg>
          </button>
        ))}
      </div>
      <span className="text-xs text-stone-500 tabular-nums">
        {value === null ? "no rating" : `${value}/5`}
      </span>
    </div>
  );
}
