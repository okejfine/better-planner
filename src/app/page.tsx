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
  getMonthSummary,
  getWeatherDaily,
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

  const [byDate, weather, profiles] = await Promise.all([
    getMonthSummary(),
    getWeatherDaily(),
    getAllProfiles(),
  ]);

  // Build full window summary (for dashboard) + lookup map.
  const summaries = new Map<Iso, ReturnType<typeof attachWeatherToDay>>();
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

  const profilesById = new Map(profiles.map((p) => [p.id, p]));

  return (
    <>
      <Header me={me} />
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <Dashboard
          summaries={summaries}
          meId={me.id}
          profilesById={profilesById}
          profiles={profiles}
        />

        <MonthNav current={monthKey} />

        <CalendarGrid
          month={month}
          summaries={summaries}
          myStarsByDate={myStarsByDate}
          meId={me.id}
        />

        <div className="pb-6 text-center text-xs text-stone-400">
          Weather is the 10-year (2016&ndash;2025) historical average, by date and city, via Open-Meteo.
        </div>
      </main>
    </>
  );
}
