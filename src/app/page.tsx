import { redirect } from "next/navigation";
import {
  monthKeyToCalendarMonth,
  parseMonthKey,
  toIso,
  WINDOW_MONTHS,
  WINDOW_YEAR,
  type Iso,
} from "@/lib/dates";
import { CalendarGrid } from "@/components/CalendarGrid";
import { Header } from "@/components/Header";
import { Dashboard } from "@/components/Dashboard";
import { MonthNav } from "@/components/MonthNav";
import {
  attachWeatherToDay,
  getAllProfiles,
  getCurrentUserProfile,
  getImportedEventsInWindow,
  getMonthSummary,
  getWeatherDaily,
  getWeddingSettings,
  type DaySummary,
} from "@/lib/queries";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const me = await getCurrentUserProfile();
  if (!me) redirect("/login");

  const { month: monthParam } = await searchParams;
  const monthKey = parseMonthKey(monthParam);
  const month = monthKeyToCalendarMonth(monthKey);

  const [byDate, weather, profiles, importedEvents, weddingSettings] =
    await Promise.all([
      getMonthSummary(),
      getWeatherDaily(),
      getAllProfiles(),
      getImportedEventsInWindow(),
      getWeddingSettings(),
    ]);

  const profilesById = new Map(profiles.map((p) => [p.id, p]));

  // Build full window summary (for dashboard) + lookup map.
  const summaries = new Map<Iso, DaySummary>();
  const myStarsByDate = new Map<Iso, number | null>();

  for (const m of WINDOW_MONTHS) {
    const lastDay = new Date(WINDOW_YEAR, m, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      const iso = toIso(new Date(WINDOW_YEAR, m - 1, d));
      const day = attachWeatherToDay(byDate.get(iso), iso, weather);
      summaries.set(iso, day);
      const myRating = day.ratings.find((r) => r.user_id === me.id);
      myStarsByDate.set(iso, myRating?.stars ?? null);
    }
  }

  // Fold imported events into summaries with avatar colors
  for (const ie of importedEvents) {
    const day = summaries.get(ie.date as Iso);
    if (!day) continue;
    const profile = profilesById.get(ie.user_id);
    if (!profile) continue;
    day.imported_events.push({
      id: ie.id,
      user_id: ie.user_id,
      title: ie.title,
      avatar_color: profile.avatar_color,
    });
  }

  const finalDate = weddingSettings?.final_date ?? null;
  const meHasImports = importedEvents.some((ie) => ie.user_id === me.id);

  return (
    <>
      <Header me={me} finalDate={finalDate} />
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <Dashboard
          summaries={summaries}
          meId={me.id}
          profilesById={profilesById}
          profiles={profiles}
          finalDate={finalDate}
          meHasImports={meHasImports}
        />

        <MonthNav current={monthKey} />

        <CalendarGrid
          month={month}
          summaries={summaries}
          myStarsByDate={myStarsByDate}
          meId={me.id}
        />

        {weather.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Weather data is unavailable because no rows were returned from
            `weather_daily`. Run the SQL migration in
            `supabase/migrations/0003_complete_schema.sql`, then re-seed weather
            via `bun run scripts/pull-weather.ts`.
          </div>
        )}

        <div className="pb-6 text-center text-xs text-stone-400">
          Weather is the 10-year (2016&ndash;2025) historical average, by date and city, via Open-Meteo.
        </div>
      </main>
    </>
  );
}
