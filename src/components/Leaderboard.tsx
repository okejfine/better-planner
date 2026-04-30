"use client";

import Link from "next/link";
import { useState } from "react";
import { format } from "date-fns";
import { fromIso, type Iso } from "@/lib/dates";
import type { DaySummary } from "@/lib/queries";
import type { DayRating, Profile } from "@/lib/types";
import { initials, cn } from "@/lib/utils";

const VISIBLE_DEFAULT = 12;

export function Leaderboard({
  summaries,
  profiles,
  meId,
}: {
  summaries: Map<Iso, DaySummary>;
  profiles: Profile[];
  meId: string;
}) {
  const [showAll, setShowAll] = useState(false);

  const rows = Array.from(summaries.values())
    .filter((d) => fromIso(d.date).getDay() !== 0)
    .filter((d) =>
      d.ratings.some(
        (r) => r.stars !== null || r.shortlisted || r.vetoed,
      ),
    )
    .sort((a, b) => {
      const sa = a.shortlist_count - a.veto_count;
      const sb = b.shortlist_count - b.veto_count;
      if (sb !== sa) return sb - sa;
      const avg = (b.group_avg_stars ?? 0) - (a.group_avg_stars ?? 0);
      if (avg !== 0) return avg;
      return a.date.localeCompare(b.date);
    });

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 p-6 text-center">
        <div className="text-sm text-stone-600">
          No picks yet. ★ a day, ⭐ shortlist it, or ⛔ veto a non-starter to fill this in.
        </div>
      </div>
    );
  }

  const visible = showAll ? rows : rows.slice(0, VISIBLE_DEFAULT);

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      {/* Mobile: stacked cards */}
      <div className="sm:hidden divide-y divide-stone-100">
        {visible.map((d) => {
          const score = d.shortlist_count - d.veto_count;
          return (
            <Link
              key={d.date}
              href={`/day/${d.date}`}
              className="block px-3 py-2.5 hover:bg-stone-50 transition"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-medium text-sm text-stone-900 tabular-nums">
                  {format(fromIso(d.date), "EEE M/d")}
                </span>
                <ScoreBadge value={score} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profiles.map((p) => {
                  const r = d.ratings.find((x) => x.user_id === p.id);
                  return (
                    <UserPill
                      key={p.id}
                      profile={p}
                      rating={r}
                      isMe={p.id === meId}
                    />
                  );
                })}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50/60">
              <th className="text-left px-4 py-2.5 font-medium text-[11px] uppercase tracking-wider text-stone-500 w-[140px]">
                Date
              </th>
              {profiles.map((p) => (
                <th
                  key={p.id}
                  className="px-2 py-2 font-medium text-[11px] uppercase tracking-wider text-stone-500"
                >
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium",
                        p.id === meId && "ring-2 ring-stone-900 ring-offset-1",
                      )}
                      style={{ backgroundColor: p.avatar_color }}
                    >
                      {initials(p.display_name)}
                    </div>
                    <span className="text-[10px] text-stone-600 normal-case font-medium tracking-normal">
                      {firstName(p.display_name)}
                    </span>
                  </div>
                </th>
              ))}
              <th className="text-right px-4 py-2 font-medium text-[11px] uppercase tracking-wider text-stone-500">
                Score
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((d) => {
              const score = d.shortlist_count - d.veto_count;
              return (
                <tr
                  key={d.date}
                  className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50/60 transition"
                >
                  <td className="px-4 py-2 align-middle">
                    <Link
                      href={`/day/${d.date}`}
                      className="font-medium text-stone-900 tabular-nums hover:underline underline-offset-2"
                    >
                      {format(fromIso(d.date), "EEE M/d")}
                    </Link>
                  </td>
                  {profiles.map((p) => (
                    <td
                      key={p.id}
                      className="px-2 py-2 align-middle text-center"
                    >
                      <UserCell
                        rating={d.ratings.find((r) => r.user_id === p.id)}
                      />
                    </td>
                  ))}
                  <td className="px-4 py-2 align-middle text-right">
                    <ScoreBadge value={score} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length > VISIBLE_DEFAULT && (
        <div className="border-t border-stone-200 px-4 py-2 flex items-center justify-between text-xs">
          <span className="text-stone-500">
            Showing {visible.length} of {rows.length} candidate days
          </span>
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-stone-700 hover:text-stone-900 font-medium"
          >
            {showAll ? "Show top 12" : `Show all ${rows.length}`}
          </button>
        </div>
      )}
    </div>
  );
}

function UserPill({
  profile,
  rating,
  isMe,
}: {
  profile: Profile;
  rating?: DayRating;
  isMe: boolean;
}) {
  const noInput =
    !rating || (rating.stars === null && !rating.shortlisted && !rating.vetoed);
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]",
        rating?.vetoed
          ? "border-rose-200 bg-rose-50/70"
          : noInput
            ? "border-stone-200 bg-stone-50/60"
            : "border-stone-200 bg-white",
      )}
    >
      <div
        className={cn(
          "h-4 w-4 rounded-full flex items-center justify-center text-white text-[8px] font-medium shrink-0",
          isMe && "ring-1 ring-stone-900 ring-offset-1",
        )}
        style={{ backgroundColor: profile.avatar_color }}
      >
        {initials(profile.display_name)}
      </div>
      <span className="text-stone-700">
        {firstName(profile.display_name)}
      </span>
      <span className="ml-0.5">
        <UserCell rating={rating} compact />
      </span>
    </div>
  );
}

function UserCell({
  rating,
  compact = false,
}: {
  rating?: DayRating;
  compact?: boolean;
}) {
  if (!rating) {
    return <span className="text-stone-300 text-xs">—</span>;
  }

  if (rating.vetoed) {
    return (
      <span
        className="inline-flex items-center gap-1 text-rose-600 text-xs font-medium"
        title="Vetoed"
      >
        ⛔
      </span>
    );
  }

  if (rating.stars === null && !rating.shortlisted) {
    return <span className="text-stone-300 text-xs">—</span>;
  }

  return (
    <div className="inline-flex items-center justify-center gap-0.5">
      {rating.stars !== null && (
        <StarsTiny value={rating.stars} compact={compact} />
      )}
      {rating.shortlisted && (
        <span className="text-amber-500 text-xs ml-0.5" title="Shortlisted">
          ★
        </span>
      )}
    </div>
  );
}

function StarsTiny({ value, compact }: { value: number; compact?: boolean }) {
  const dot = compact ? "h-1 w-1" : "h-1.5 w-1.5";
  return (
    <span
      className="inline-flex gap-px"
      title={`${value} / 5 stars`}
      aria-label={`${value} of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn(
            "rounded-full",
            dot,
            i <= value ? "bg-amber-400" : "bg-stone-200",
          )}
        />
      ))}
    </span>
  );
}

function ScoreBadge({ value }: { value: number }) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const abs = Math.abs(value);
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums min-w-[2.25rem]",
        value > 0 && "bg-emerald-50 text-emerald-700 border border-emerald-200",
        value < 0 && "bg-rose-50 text-rose-700 border border-rose-200",
        value === 0 && "bg-stone-100 text-stone-500 border border-stone-200",
      )}
    >
      {sign}
      {abs}
    </span>
  );
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}
