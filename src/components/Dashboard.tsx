import Link from "next/link";
import { format } from "date-fns";
import { fromIso, type Iso } from "@/lib/dates";
import { computePopularLocations, type DaySummary } from "@/lib/queries";
import type { Profile } from "@/lib/types";
import { AddEventDialog } from "@/components/AddEventDialog";
import { Leaderboard } from "@/components/Leaderboard";
import { IcalDropzone } from "@/components/IcalDropzone";

export function Dashboard({
  summaries,
  meId,
  profilesById,
  profiles,
  finalDate,
  meHasImports,
}: {
  summaries: Map<Iso, DaySummary>;
  meId: string;
  profilesById: Map<string, Profile>;
  profiles: Profile[];
  finalDate?: string | null;
  meHasImports?: boolean;
}) {
  void profilesById; // per-row lookup happens inside Leaderboard via profiles

  const myShortlist = Array.from(summaries.values())
    .filter((d) => fromIso(d.date).getDay() !== 0)
    .filter((d) =>
      d.ratings.some((r) => r.user_id === meId && r.shortlisted),
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  const popularLocations = computePopularLocations(summaries);

  return (
    <section className="rounded-2xl border border-stone-200 bg-white px-3 py-3 sm:px-5 sm:py-4 space-y-3 sm:space-y-4">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <div className="font-serif text-base sm:text-lg tracking-tight text-stone-900">
            Where we&rsquo;re landing
          </div>
          <div className="text-[11px] sm:text-xs text-stone-500">
            Score = shortlists − vetoes.
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {finalDate && (
            <Link
              href={`/day/${finalDate}`}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition"
            >
              💍 {format(fromIso(finalDate), "EEE M/d")}
            </Link>
          )}
          <AddEventDialog defaultDate="2026-07-01" />
        </div>
      </div>

      <YourShortlist dates={myShortlist.map((d) => d.date)} />

      {popularLocations.length > 0 && (
        <PopularLocations locations={popularLocations} />
      )}

      <Leaderboard summaries={summaries} profiles={profiles} meId={meId} />

      <div className="pt-1 border-t border-stone-100">
        <IcalDropzone hasExisting={!!meHasImports} />
      </div>
    </section>
  );
}

function YourShortlist({ dates }: { dates: Iso[] }) {
  return (
    <div className="flex items-center gap-2 flex-wrap text-xs">
      <span className="uppercase tracking-wider text-[10px] text-stone-400 font-medium">
        Your shortlist
      </span>
      {dates.length === 0 ? (
        <span className="text-stone-400 italic">
          ⭐ shortlist a day to see it here.
        </span>
      ) : (
        dates.map((iso) => (
          <Link
            key={iso}
            href={`/day/${iso}`}
            className="rounded-full border border-amber-200 bg-amber-50/60 px-2.5 py-0.5 tabular-nums text-amber-900 hover:bg-amber-100 transition"
          >
            {format(fromIso(iso), "EEE M/d")}
          </Link>
        ))
      )}
    </div>
  );
}

function PopularLocations({
  locations,
}: {
  locations: { cityId: string; label: string; count: number }[];
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap text-xs">
      <span className="uppercase tracking-wider text-[10px] text-stone-400 font-medium">
        Popular locations
      </span>
      {locations.map(({ cityId, label, count }) => (
        <span
          key={cityId}
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-emerald-800 font-medium"
        >
          {label}
          <span className="rounded-full bg-emerald-200/70 px-1.5 py-px text-[9px] font-semibold tabular-nums text-emerald-900">
            {count}
          </span>
        </span>
      ))}
    </div>
  );
}
