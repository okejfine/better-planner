import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import {
  getAllProfiles,
  getCommentsForDate,
  getCurrentUserProfile,
  getEventsInWindow,
  getRatingsInWindow,
  getWeatherDaily,
  getWeatherHourlyForDate,
  getYearRainForDate,
} from "@/lib/queries";
import { fromIso, isInWindow } from "@/lib/dates";
import { CITIES } from "@/lib/cities";
import { Header } from "@/components/Header";
import { EventBar } from "@/components/EventBar";
import { StarRatingInput } from "@/components/StarRatingInput";
import { ShortlistButton, VetoButton } from "@/components/Toggles";
import { WeatherChart } from "@/components/WeatherChart";
import { CommentThread } from "@/components/CommentThread";
import { AddCustomEvent } from "@/components/AddCustomEvent";
import { CustomEventItem } from "@/components/CustomEventItem";
import { RainLikelihoodCard } from "@/components/RainLikelihoodCard";
import { StarsRow } from "@/components/StarsRow";
import { initials } from "@/lib/utils";

export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!isInWindow(date)) notFound();

  const me = await getCurrentUserProfile();
  if (!me) redirect("/login");

  const [
    profiles,
    allEvents,
    allRatings,
    hourly,
    dailyWeather,
    comments,
    yearRain,
  ] = await Promise.all([
    getAllProfiles(),
    getEventsInWindow(),
    getRatingsInWindow(),
    getWeatherHourlyForDate(date),
    getWeatherDaily(),
    getCommentsForDate(date),
    getYearRainForDate(date),
  ]);

  const profilesById = new Map(profiles.map((p) => [p.id, p]));
  const events = allEvents.filter((e) => e.date === date);
  const ratings = allRatings.filter((r) => r.date === date);

  const myRating = ratings.find((r) => r.user_id === me.id);

  // Daily weather summary across cities for this date
  const md = `${date.slice(5, 7)}${date.slice(8, 10)}`;
  const dailyForDate = dailyWeather.filter((w) => w.month_day === md);
  const avgHigh =
    dailyForDate.length === 0
      ? null
      : dailyForDate.reduce((a, b) => a + Number(b.mean_high_f), 0) /
        dailyForDate.length;
  const avgLow =
    dailyForDate.length === 0
      ? null
      : dailyForDate.reduce((a, b) => a + Number(b.mean_low_f), 0) /
        dailyForDate.length;
  const avgRain =
    dailyForDate.length === 0
      ? 0
      : dailyForDate.reduce((a, b) => a + Number(b.rain_probability), 0) /
        dailyForDate.length;

  const dateObj = fromIso(date);
  const isSunday = dateObj.getDay() === 0;

  return (
    <>
      <Header me={me} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900"
        >
          ← Back to calendar
        </Link>

        <div>
          <div className="text-xs uppercase tracking-widest text-stone-400">
            {format(dateObj, "EEEE")}
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl tracking-tight text-stone-900 mt-1">
            {format(dateObj, "MMMM d, yyyy")}
          </h1>
          {avgHigh !== null && (
            <p className="text-stone-500 mt-2 text-sm">
              Average <strong className="text-stone-700">{Math.round(avgHigh)}°</strong> high /{" "}
              <strong className="text-stone-700">{Math.round(avgLow ?? 0)}°</strong> low &middot;{" "}
              rained <strong className="text-stone-700">{Math.round(avgRain * 10)}</strong> / 10 yrs
              <span className="text-stone-400"> (10-yr avg, Utah County)</span>
            </p>
          )}
        </div>

        {!isSunday && (
          <section className="rounded-2xl border border-stone-200 bg-white p-6 space-y-5">
            <div>
              <div className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-2">
                Your rating
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <StarRatingInput date={date} initial={myRating?.stars ?? null} />
                <ShortlistButton
                  date={date}
                  initial={myRating?.shortlisted ?? false}
                />
                <VetoButton date={date} initial={myRating?.vetoed ?? false} />
              </div>
            </div>

            {ratings.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wider text-stone-500 font-medium mb-2">
                  Group
                </div>
                <div className="flex flex-wrap gap-3">
                  {profiles.map((p) => {
                    const r = ratings.find((x) => x.user_id === p.id);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 pl-1 pr-3 py-1"
                      >
                        <div
                          className="h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-medium"
                          style={{ backgroundColor: p.avatar_color }}
                        >
                          {initials(p.display_name)}
                        </div>
                        <span className="text-xs text-stone-700">
                          {p.display_name}
                        </span>
                        <StarsRow value={r?.stars ?? null} size="xs" />
                        {r?.shortlisted && (
                          <span className="text-amber-500 text-xs">★</span>
                        )}
                        {r?.vetoed && (
                          <span className="text-rose-500 text-xs">⛔</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        <section className="space-y-3">
          <div className="text-xs uppercase tracking-wider text-stone-500 font-medium">
            On this day
          </div>
          {events.length === 0 ? (
            <div className="text-sm text-stone-500 italic">
              No events on this day.
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((e) =>
                e.kind === "custom" ? (
                  <CustomEventItem
                    key={e.id}
                    event={e}
                    ownedByMe={e.created_by === me.id}
                  />
                ) : (
                  <div key={e.id} className="flex-1 min-w-0">
                    <EventBar kind={e.kind} title={e.title} size="md" />
                    {e.description && (
                      <div className="text-xs text-stone-500 mt-1">
                        {e.description}
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
          <AddCustomEvent date={date} />
        </section>

        <section>
          <WeatherChart rows={hourly} />
          {dailyForDate.length > 0 && (
            <>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
                {CITIES.map((c) => {
                  const w = dailyForDate.find((d) => d.city === c.id);
                  const yearsRained = w
                    ? Math.round(Number(w.rain_probability) * 10)
                    : 0;
                  return (
                    <div
                      key={c.id}
                      className="rounded-lg border border-stone-200 bg-white px-3 py-2"
                    >
                      <div className="text-xs uppercase tracking-wider text-stone-400">
                        {c.label}
                      </div>
                      {w && (
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-lg font-medium text-stone-900 tabular-nums">
                            {Math.round(Number(w.mean_high_f))}°
                          </span>
                          <span className="text-xs text-stone-500 tabular-nums">
                            / {Math.round(Number(w.mean_low_f))}°
                          </span>
                        </div>
                      )}
                      {w && (
                        <div className="text-[11px] text-stone-500 tabular-nums">
                          rained {yearsRained} / 10 yrs
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <RainLikelihoodCard avgRain={avgRain} yearRain={yearRain} />
            </>
          )}
        </section>

        <section className="space-y-4">
          <div className="text-xs uppercase tracking-wider text-stone-500 font-medium">
            Discussion
          </div>
          <CommentThread
            date={date}
            comments={comments}
            profilesById={profilesById}
            meId={me.id}
          />
        </section>
      </main>
    </>
  );
}

