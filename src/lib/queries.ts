import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CityId } from "@/lib/cities";
import {
  WINDOW_MONTHS,
  WINDOW_YEAR,
  toMonthDay,
  type Iso,
} from "@/lib/dates";
import { BYPASS_PROFILE, isBypassAuthEnabled } from "@/lib/auth-mode";
import type {
  CommentRow,
  DayRating,
  EventRow,
  Profile,
  WeatherDaily,
  WeatherHourly,
  WeatherYearRain,
} from "@/lib/types";

function windowStart(): Iso {
  return `${WINDOW_YEAR}-${String(WINDOW_MONTHS[0]).padStart(2, "0")}-01`;
}

function windowEnd(): Iso {
  const m = WINDOW_MONTHS[WINDOW_MONTHS.length - 1];
  // last day of last window month
  const d = new Date(WINDOW_YEAR, m, 0).getDate();
  return `${WINDOW_YEAR}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export const getCurrentUserProfile = cache(async () => {
  if (isBypassAuthEnabled()) return BYPASS_PROFILE;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const fallbackName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Guest";
  const fallbackProfile: Profile = {
    id: user.id,
    email: user.email ?? "",
    display_name: fallbackName,
    avatar_color: "#6366f1",
  };

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, avatar_color")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    // Keep auth flow usable even when schema or RLS is temporarily misconfigured.
    return fallbackProfile;
  }
  if (data) return data as Profile;
  // Profile row missing (trigger failed or row was wiped). Recover by inserting.
  const { data: created, error: createError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email ?? "",
      display_name: fallbackName,
    })
    .select("id, email, display_name, avatar_color")
    .single();
  if (createError) {
    return fallbackProfile;
  }
  return (created as Profile | null) ?? fallbackProfile;
});

export const getAllProfiles = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, display_name, avatar_color")
    .order("created_at", { ascending: true });
  return (data ?? []) as Profile[];
});

export const getEventsInWindow = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .gte("date", windowStart())
    .lte("date", windowEnd())
    .order("date", { ascending: true });
  return (data ?? []) as EventRow[];
});

export const getRatingsInWindow = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("day_ratings")
    .select("*")
    .gte("date", windowStart())
    .lte("date", windowEnd());
  return (data ?? []) as DayRating[];
});

async function fetchAllRows<T>(
  table: "weather_daily",
  logLabel: string,
): Promise<T[]> {
  const supabase = await createClient();
  const pageSize = 1000;
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("city", { ascending: true })
      .order("month_day", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error(`[${logLabel}] query failed`, {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      break;
    }

    if (!data?.length) break;
    rows.push(...(data as T[]));
    if (data.length < pageSize) break;
  }

  return rows;
}

export const getWeatherDaily = cache(async () => {
  return fetchAllRows<WeatherDaily>("weather_daily", "weather_daily");
});

export const getWeatherHourlyForDate = cache(async (iso: Iso) => {
  const md = toMonthDay(iso);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weather_hourly")
    .select("*")
    .eq("month_day", md)
    .order("hour", { ascending: true });
  if (error) {
    console.error("[weather_hourly] query failed", {
      month_day: md,
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }
  return (data ?? []) as WeatherHourly[];
});

export const getYearRainForDate = cache(async (iso: Iso) => {
  const md = toMonthDay(iso);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weather_year_rain")
    .select("*")
    .eq("month_day", md)
    .order("hour", { ascending: true });
  if (error) {
    console.error("[weather_year_rain] query failed", {
      month_day: md,
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }
  return (data ?? []) as WeatherYearRain[];
});

export const getCommentsForDate = cache(async (iso: Iso) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select("*")
    .eq("date", iso)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  return (data ?? []) as CommentRow[];
});

export type DaySummary = {
  date: Iso;
  events: EventRow[];
  ratings: DayRating[]; // all users
  weather_by_city: Partial<Record<CityId, WeatherDaily>>;
  group_avg_stars: number | null;
  shortlist_count: number;
  veto_count: number;
};

export async function getMonthSummary(): Promise<Map<Iso, DaySummary>> {
  const [events, ratings, weather] = await Promise.all([
    getEventsInWindow(),
    getRatingsInWindow(),
    getWeatherDaily(),
  ]);

  const byDate = new Map<Iso, DaySummary>();

  function getOrInit(iso: Iso): DaySummary {
    let entry = byDate.get(iso);
    if (!entry) {
      entry = {
        date: iso,
        events: [],
        ratings: [],
        weather_by_city: {},
        group_avg_stars: null,
        shortlist_count: 0,
        veto_count: 0,
      };
      byDate.set(iso, entry);
    }
    return entry;
  }

  for (const e of events) getOrInit(e.date).events.push(e);
  for (const r of ratings) {
    const d = getOrInit(r.date);
    d.ratings.push(r);
    if (r.shortlisted) d.shortlist_count += 1;
    if (r.vetoed) d.veto_count += 1;
  }

  // Aggregate stars per day
  for (const day of byDate.values()) {
    const starsList = day.ratings
      .map((r) => r.stars)
      .filter((s): s is number => typeof s === "number");
    day.group_avg_stars =
      starsList.length === 0
        ? null
        : starsList.reduce((a, b) => a + b, 0) / starsList.length;
  }

  // Attach daily weather (by month_day key, applied per date)
  const weatherByKey = new Map<string, WeatherDaily>();
  for (const w of weather) {
    weatherByKey.set(`${w.city}:${w.month_day}`, w);
  }

  // Walk every date in window and ensure entry exists with weather
  // Caller is expected to enumerate dates from buildWindow();
  // we attach weather lazily on lookup via a helper:
  return byDate;
}

export function attachWeatherToDay(
  day: DaySummary | undefined,
  iso: Iso,
  weather: WeatherDaily[],
): DaySummary {
  const md = toMonthDay(iso);
  const out: DaySummary = day ?? {
    date: iso,
    events: [],
    ratings: [],
    weather_by_city: {},
    group_avg_stars: null,
    shortlist_count: 0,
    veto_count: 0,
  };
  for (const w of weather) {
    if (w.month_day === md) {
      out.weather_by_city[w.city] = w;
    }
  }
  return out;
}
