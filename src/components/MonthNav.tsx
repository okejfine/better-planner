import Link from "next/link";
import { format } from "date-fns";
import {
  adjacentMonths,
  monthKeyToCalendarMonth,
  type WindowMonthKey,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

export function MonthNav({ current }: { current: WindowMonthKey }) {
  const month = monthKeyToCalendarMonth(current);
  const { prev, next } = adjacentMonths(current);

  const label = format(new Date(month.year, month.month - 1, 1), "MMMM yyyy");

  return (
    <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-2 py-2 sm:px-4 sm:py-3">
      <NavButton href={prev ? `/?month=${prev}` : null} dir="prev" />
      <h2 className="font-serif text-lg sm:text-2xl tracking-tight text-stone-900">
        {label}
      </h2>
      <NavButton href={next ? `/?month=${next}` : null} dir="next" />
    </div>
  );
}

function NavButton({
  href,
  dir,
}: {
  href: string | null;
  dir: "prev" | "next";
}) {
  const symbol = dir === "prev" ? "‹" : "›";
  const label = dir === "prev" ? "Previous month" : "Next month";
  if (!href) {
    return (
      <span
        aria-label={label}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-300 cursor-not-allowed select-none text-xl",
        )}
      >
        {symbol}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      prefetch
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-700 hover:bg-stone-100 transition select-none text-xl",
      )}
    >
      {symbol}
    </Link>
  );
}
