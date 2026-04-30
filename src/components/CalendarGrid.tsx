import { WEEKDAY_LABELS, type CalendarMonth } from "@/lib/dates";
import { DayTile } from "@/components/DayTile";
import type { DaySummary } from "@/lib/queries";

export function CalendarGrid({
  month,
  summaries,
  myStarsByDate,
  meId,
}: {
  month: CalendarMonth;
  summaries: Map<string, DaySummary>;
  myStarsByDate: Map<string, number | null>;
  meId: string;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="grid grid-cols-7 text-[11px] font-medium uppercase tracking-wider text-stone-400 border-b border-stone-200 bg-stone-50">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="px-2 py-2 text-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 border-l border-stone-200 border-t-0">
        {month.weeks.flat().map((iso, idx) => {
          if (!iso) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-[112px] border-r border-b border-stone-200 bg-stone-50/40"
              />
            );
          }
          const inMonth =
            new Date(iso).getMonth() + 1 === month.month;
          return (
            <DayTile
              key={iso}
              iso={iso}
              summary={summaries.get(iso)}
              myStars={myStarsByDate.get(iso) ?? null}
              inMonth={inMonth}
              meId={meId}
            />
          );
        })}
      </div>
    </section>
  );
}
