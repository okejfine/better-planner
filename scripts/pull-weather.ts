/**
 * Pull 10-year (2016-2025) hourly weather for Aug 1 - Oct 31 from Open-Meteo's
 * archive API for 5 Utah County cities. Aggregate into:
 *   - daily means (high, low, rain probability)
 *   - hourly means (temp, precip, wind) keyed by month-day-hour
 * Writes JSON to /tmp/wedding-weather.json so we can apply it via execute_sql.
 *
 * Usage: bun run scripts/pull-weather.ts
 */

const CITIES = [
  { id: "lindon", lat: 40.341, lon: -111.7211 },
  { id: "highland", lat: 40.4291, lon: -111.7958 },
  { id: "lehi", lat: 40.3916, lon: -111.8508 },
  { id: "orem", lat: 40.2969, lon: -111.6946 },
  { id: "alpine", lat: 40.4533, lon: -111.7741 },
] as const;

const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

type DailyAcc = {
  highs: number[]; // one daily high per year
  lows: number[];
  rainyDays: number; // years where total precip > 1mm
  yearsCount: number;
};

type HourlyAcc = {
  temps: number[]; // C
  precip: number[]; // mm
  wind: number[]; // m/s
  yearsWithRain: number; // count of years where this hour had > 0.1mm
};

async function fetchYear(city: (typeof CITIES)[number], year: number) {
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", String(city.lat));
  url.searchParams.set("longitude", String(city.lon));
  url.searchParams.set("start_date", `${year}-08-01`);
  url.searchParams.set("end_date", `${year}-10-31`);
  url.searchParams.set(
    "hourly",
    "temperature_2m,precipitation,wind_speed_10m",
  );
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("wind_speed_unit", "ms");
  url.searchParams.set("timezone", "America/Denver");

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Open-Meteo ${city.id} ${year}: ${res.status} ${await res.text()}`,
    );
  }
  return (await res.json()) as {
    hourly: {
      time: string[]; // 'YYYY-MM-DDTHH:00'
      temperature_2m: number[];
      precipitation: number[];
      wind_speed_10m: number[];
    };
  };
}

function cToF(c: number) {
  return c * 1.8 + 32;
}
function msToMph(ms: number) {
  return ms * 2.23694;
}

async function main() {
  // accumulators keyed by month-day for daily; month-day-hour for hourly.
  type CityResult = {
    daily: Map<string, DailyAcc>;
    hourly: Map<string, HourlyAcc>;
    yearRain: Array<{
      month_day: string;
      hour: number;
      year: number;
      precip_mm: number;
    }>;
  };
  const results: Record<string, CityResult> = {};

  for (const city of CITIES) {
    console.log(`Pulling ${city.id}...`);
    const daily = new Map<string, DailyAcc>();
    const hourly = new Map<string, HourlyAcc>();
    const yearRain: CityResult["yearRain"] = [];

    for (const year of YEARS) {
      const data = await fetchYear(city, year);

      // build per-day buckets for this year
      const dayBuckets = new Map<
        string,
        { high: number; low: number; precipTotal: number }
      >();

      for (let i = 0; i < data.hourly.time.length; i++) {
        const t = data.hourly.time[i]; // 'YYYY-MM-DDTHH:00'
        const dateIso = t.slice(0, 10);
        const monthDay = `${dateIso.slice(5, 7)}${dateIso.slice(8, 10)}`;
        const hour = parseInt(t.slice(11, 13), 10);
        const tempC = data.hourly.temperature_2m[i];
        const precipMm = data.hourly.precipitation[i] ?? 0;
        const windMs = data.hourly.wind_speed_10m[i] ?? 0;

        // Hourly aggregation
        const hkey = `${monthDay}:${hour}`;
        let h = hourly.get(hkey);
        if (!h) {
          h = { temps: [], precip: [], wind: [], yearsWithRain: 0 };
          hourly.set(hkey, h);
        }
        h.temps.push(tempC);
        h.precip.push(precipMm);
        h.wind.push(windMs);
        if (precipMm > 0.1) {
          h.yearsWithRain += 1;
          yearRain.push({
            month_day: monthDay,
            hour,
            year,
            precip_mm: round2(precipMm),
          });
        }

        // Per-day per-year bucket
        let db = dayBuckets.get(dateIso);
        if (!db) {
          db = { high: -Infinity, low: Infinity, precipTotal: 0 };
          dayBuckets.set(dateIso, db);
        }
        if (tempC > db.high) db.high = tempC;
        if (tempC < db.low) db.low = tempC;
        db.precipTotal += precipMm;
      }

      // Fold this year's day buckets into daily acc by month-day
      for (const [dateIso, db] of dayBuckets) {
        const monthDay = `${dateIso.slice(5, 7)}${dateIso.slice(8, 10)}`;
        let d = daily.get(monthDay);
        if (!d) {
          d = { highs: [], lows: [], rainyDays: 0, yearsCount: 0 };
          daily.set(monthDay, d);
        }
        d.highs.push(db.high);
        d.lows.push(db.low);
        if (db.precipTotal > 1) d.rainyDays += 1;
        d.yearsCount += 1;
      }
    }

    results[city.id] = { daily, hourly, yearRain };
  }

  // Convert to flat arrays of rows for SQL.
  const dailyRows: Array<{
    city: string;
    month_day: string;
    mean_high_f: number;
    mean_low_f: number;
    rain_probability: number;
  }> = [];
  const hourlyRows: Array<{
    city: string;
    month_day: string;
    hour: number;
    mean_temp_f: number;
    mean_precip_mm: number;
    mean_wind_mph: number;
    years_with_rain: number;
  }> = [];

  for (const city of CITIES) {
    const r = results[city.id];
    for (const [monthDay, acc] of r.daily) {
      const meanHighC = avg(acc.highs);
      const meanLowC = avg(acc.lows);
      dailyRows.push({
        city: city.id,
        month_day: monthDay,
        mean_high_f: round1(cToF(meanHighC)),
        mean_low_f: round1(cToF(meanLowC)),
        rain_probability: round3(acc.rainyDays / acc.yearsCount),
      });
    }
    for (const [key, acc] of r.hourly) {
      const [monthDay, hourStr] = key.split(":");
      hourlyRows.push({
        city: city.id,
        month_day: monthDay,
        hour: parseInt(hourStr, 10),
        mean_temp_f: round1(cToF(avg(acc.temps))),
        mean_precip_mm: round2(avg(acc.precip)),
        mean_wind_mph: round1(msToMph(avg(acc.wind))),
        years_with_rain: acc.yearsWithRain,
      });
    }
  }

  const yearRainRows: Array<{
    city: string;
    month_day: string;
    hour: number;
    year: number;
    precip_mm: number;
  }> = [];
  for (const city of CITIES) {
    for (const r of results[city.id].yearRain) {
      yearRainRows.push({ city: city.id, ...r });
    }
  }

  const out = { daily: dailyRows, hourly: hourlyRows, year_rain: yearRainRows };
  await Bun.write("/tmp/wedding-weather.json", JSON.stringify(out));
  console.log(
    `Wrote /tmp/wedding-weather.json: ${dailyRows.length} daily, ${hourlyRows.length} hourly, ${yearRainRows.length} year-rain events`,
  );
}

function avg(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
