import Link from "next/link";
import { format } from "date-fns";
import { fromIso, type Iso } from "@/lib/dates";
import type { DaySummary } from "@/lib/queries";
import type { Profile } from "@/lib/types";
import { AddEventDialog } from "@/components/AddEventDialog";
import { Leaderboard } from "@/components/Leaderboard";

export function Dashboard({
  summaries,
  meId,
  profilesById,
  profiles,
}: {
  summaries: Map<Iso, DaySummary>;
  meId: string;
  profilesById: Map<string, Profile>;
  profiles: Profile[];
}) {
  void profilesById; // (kept for parity; per-row lookup happens inside Leaderboard via profiles)

  const myShortlist = Array.from(summaries.values())
    .filter((d) => fromIso(d.date).getDay() !== 0)
    .filter((d) =>
      d.ratings.some((r) => r.user_id === meId && r.shortlisted),
    )
    .sort((a, b) => a.date.localeCompare(b.date));

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
        <AddEventDialog defaultDate="2026-08-01" />
      </div>

      <YourShortlist dates={myShortlist.map((d) => d.date)} />

      <Leaderboard summaries={summaries} profiles={profiles} meId={meId} />
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
