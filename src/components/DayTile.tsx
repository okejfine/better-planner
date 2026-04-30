import Link from "next/link";
import { cn } from "@/lib/utils";
import { fromIso, type Iso } from "@/lib/dates";
import type { DaySummary } from "@/lib/queries";
import type { EventKind } from "@/lib/types";
import { StarsRow } from "@/components/StarsRow";
import { EventBar } from "@/components/EventBar";

const CITY_AVG_KEYS = ["lindon", "highland", "lehi", "orem", "alpine"] as const;

const EVENT_DOT_COLOR: Record<EventKind, string> = {
  byu_football_home: "bg-[#002E5D]",
  byu_football_away: "bg-[#002E5D]/40",
  lone_peak_home: "bg-[#7c1a3a]",
  lone_peak_away: "bg-[#7c1a3a]/40",
  federal_holiday: "bg-rose-400",
  custom: "bg-emerald-400",
};

export function DayTile({
  iso,
  summary,
  myStars,
  inMonth,
  meId,
}: {
  iso: Iso;
  summary?: DaySummary;
  myStars: number | null;
  inMonth: boolean;
  meId: string;
}) {
  const date = fromIso(iso);
  const dayNum = date.getDate();
  const dow = date.getDay();
  const isSunday = dow === 0;
  const isSaturday = dow === 6;

  const highs = CITY_AVG_KEYS.map(
    (c) => summary?.weather_by_city[c]?.mean_high_f,
  ).filter((v): v is number => typeof v === "number");
  const avgHigh = highs.length
    ? Math.round(highs.reduce((a, b) => a + b, 0) / highs.length)
    : null;

  const lows = CITY_AVG_KEYS.map(
    (c) => summary?.weather_by_city[c]?.mean_low_f,
  ).filter((v): v is number => typeof v === "number");
  const avgLow = lows.length
    ? Math.round(lows.reduce((a, b) => a + b, 0) / lows.length)
    : null;

  const rainProbs = CITY_AVG_KEYS.map(
    (c) => summary?.weather_by_city[c]?.rain_probability,
  ).filter((v): v is number => typeof v === "number");
  const avgRain = rainProbs.length
    ? rainProbs.reduce((a, b) => a + b, 0) / rainProbs.length
    : 0;

  const myRating = summary?.ratings.find((r) => r.user_id === meId);
  const isVetoedByMe = myRating?.vetoed === true;
  const isShortlistedByMe = myRating?.shortlisted === true;

  const sundayBlocked = inMonth && isSunday;

  const containerClasses = cn(
    "group relative flex flex-col p-1 sm:p-1.5 border-r border-b border-stone-200",
    "min-h-[68px] sm:min-h-[112px] sm:aspect-square",
    !inMonth && "bg-stone-50/50 text-stone-300 hover:bg-stone-100 transition",
    inMonth && !sundayBlocked && "bg-white hover:bg-stone-50 transition",
    inMonth && sundayBlocked && [
      "bg-stone-100/80",
      "[background-image:repeating-linear-gradient(135deg,transparent_0_8px,rgba(120,113,108,0.05)_8px_9px)]",
      "cursor-not-allowed",
    ],
    isSaturday && inMonth && !sundayBlocked && "bg-stone-50/40",
  );

  const dayHeader = (
    <div className="flex items-start justify-between gap-0.5 leading-none">
      <span
        className={cn(
          "tabular-nums font-medium text-[11px] sm:text-[11px]",
          inMonth && !sundayBlocked && "text-stone-900",
          sundayBlocked && "text-stone-400",
          !inMonth && "text-stone-300",
        )}
      >
        {dayNum}
      </span>
      {avgHigh !== null && inMonth && (
        <div
          className={cn(
            "text-right tabular-nums",
            sundayBlocked && "opacity-60",
          )}
          title={`10-yr avg: ${avgHigh}° high / ${avgLow}° low${avgRain > 0 ? ` · rained ${Math.round(avgRain * 10)}/10 yrs` : ""}`}
        >
          <div className="text-[10px] sm:text-[12px] leading-none flex items-baseline justify-end gap-0.5">
            {avgRain >= 0.3 && (
              <span className="text-blue-500 text-[9px] sm:text-[10px]" aria-hidden>
                ☂
              </span>
            )}
            <span className="font-medium text-stone-800">{avgHigh}°</span>
            <span className="hidden sm:inline text-stone-400 text-[10px]">
              /{avgLow}°
            </span>
          </div>
          {avgRain >= 0.3 && (
            <div className="hidden sm:block mt-0.5 text-[9px] text-blue-500 leading-none tabular-nums">
              {Math.round(avgRain * 10)}/10 yrs rain
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Mobile: single row of small colored dots representing event kinds.
  // Desktop: full event bars (existing behavior).
  const eventDotsMobile = summary?.events && summary.events.length > 0 && (
    <div className="sm:hidden mt-0.5 flex items-center gap-0.5 flex-wrap">
      {summary.events.slice(0, 4).map((e) => (
        <span
          key={e.id}
          className={cn("h-1.5 w-1.5 rounded-full", EVENT_DOT_COLOR[e.kind])}
          title={e.title}
        />
      ))}
      {summary.events.length > 4 && (
        <span className="text-[8px] text-stone-400">
          +{summary.events.length - 4}
        </span>
      )}
    </div>
  );

  const eventListDesktop = (
    <div
      className={cn(
        "hidden sm:flex mt-1 flex-col gap-0.5 overflow-hidden",
        sundayBlocked && "opacity-70",
      )}
    >
      {summary?.events.slice(0, 3).map((e) => (
        <EventBar key={e.id} kind={e.kind} title={e.title} />
      ))}
      {summary && summary.events.length > 3 && (
        <div className="text-[10px] text-stone-500 px-1">
          +{summary.events.length - 3} more
        </div>
      )}
    </div>
  );

  if (sundayBlocked) {
    return (
      <div className={containerClasses} aria-disabled>
        {dayHeader}
        {eventDotsMobile}
        {eventListDesktop}
      </div>
    );
  }

  // Mobile bottom strip: condensed signals.
  const mobileSignals = inMonth && (
    <div className="sm:hidden mt-auto flex items-center gap-1 pt-1 text-[9px]">
      {myStars !== null && (
        <span className="text-amber-600 tabular-nums font-medium">★{myStars}</span>
      )}
      {isShortlistedByMe && <span className="text-amber-500">⭐</span>}
      {isVetoedByMe && <span className="text-rose-500">⛔</span>}
      {(summary?.shortlist_count ?? 0) > 0 && !isShortlistedByMe && (
        <span className="text-stone-500 tabular-nums">★{summary?.shortlist_count}</span>
      )}
      {(summary?.veto_count ?? 0) > 0 && !isVetoedByMe && (
        <span className="text-rose-500 tabular-nums">⛔{summary?.veto_count}</span>
      )}
    </div>
  );

  const desktopSignals = inMonth && (
    <div className="hidden sm:flex mt-auto items-center justify-between gap-1 pt-1">
      <div className="flex items-center gap-1">
        <StarsRow value={summary?.group_avg_stars ?? null} size="xs" muted />
        {myStars !== null && (
          <span className="text-[10px] text-amber-700 tabular-nums">
            ✶{myStars}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 text-[10px] text-stone-500">
        {(summary?.shortlist_count ?? 0) > 0 && (
          <span
            className={isShortlistedByMe ? "text-amber-600 font-medium" : ""}
            title={isShortlistedByMe ? "You and others shortlisted" : "Shortlisted"}
          >
            ★{summary?.shortlist_count}
          </span>
        )}
        {(summary?.veto_count ?? 0) > 0 && (
          <span
            className={isVetoedByMe ? "text-rose-600 font-semibold" : "text-rose-500"}
            title={isVetoedByMe ? "You vetoed" : "Vetoed"}
          >
            ⛔{summary?.veto_count}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <Link href={`/day/${iso}`} prefetch={false} className={containerClasses}>
      {dayHeader}
      {eventDotsMobile}
      {eventListDesktop}
      {mobileSignals}
      {desktopSignals}
    </Link>
  );
}
