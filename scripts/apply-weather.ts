/**
 * Read /tmp/wedding-weather.json and upsert it into the weather_* tables using
 * the Supabase service role. This is the apply step that pairs with
 * pull-weather.ts (which only writes the JSON).
 *
 * Idempotent: every table upserts on its primary key, so re-running refreshes
 * existing month-days and adds new ones (e.g. the Nov–Dec extension).
 *
 * Usage: bun run scripts/apply-weather.ts
 */

import { createClient } from "@supabase/supabase-js";

type DailyRow = {
  city: string;
  month_day: string;
  mean_high_f: number;
  mean_low_f: number;
  rain_probability: number;
};
type HourlyRow = {
  city: string;
  month_day: string;
  hour: number;
  mean_temp_f: number;
  mean_precip_mm: number;
  mean_wind_mph: number;
  years_with_rain?: number;
};
type YearRainRow = {
  city: string;
  month_day: string;
  hour: number;
  year: number;
  precip_mm: number;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const data = JSON.parse(
  await Bun.file("/tmp/wedding-weather.json").text(),
) as {
  daily: DailyRow[];
  hourly: HourlyRow[];
  year_rain: YearRainRow[];
};

const CHUNK = 1000;

async function upsertAll<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  onConflict: string,
) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from(table)
      .upsert(slice, { onConflict });
    if (error) {
      throw new Error(`${table} upsert (rows ${i}-${i + slice.length}): ${error.message}`);
    }
    process.stdout.write(
      `\r${table}: ${Math.min(i + CHUNK, rows.length)}/${rows.length}`,
    );
  }
  process.stdout.write("\n");
}

const hourly = data.hourly.map((r) => ({
  ...r,
  years_with_rain: r.years_with_rain ?? 0,
}));

await upsertAll("weather_daily", data.daily, "city,month_day");
await upsertAll("weather_hourly", hourly, "city,month_day,hour");
await upsertAll("weather_year_rain", data.year_rain, "city,month_day,hour,year");

console.log(
  `Applied weather: ${data.daily.length} daily, ${hourly.length} hourly, ${data.year_rain.length} year-rain rows`,
);
