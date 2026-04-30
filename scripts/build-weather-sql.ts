/**
 * Read /tmp/wedding-weather.json and emit chunked SQL files for execution.
 * Splits hourly into chunks of 1000 rows; daily fits in one file.
 */

const data = JSON.parse(
  await Bun.file("/tmp/wedding-weather.json").text(),
) as {
  daily: Array<{
    city: string;
    month_day: string;
    mean_high_f: number;
    mean_low_f: number;
    rain_probability: number;
  }>;
  hourly: Array<{
    city: string;
    month_day: string;
    hour: number;
    mean_temp_f: number;
    mean_precip_mm: number;
    mean_wind_mph: number;
  }>;
};

const dailySql = `insert into public.weather_daily
(city, month_day, mean_high_f, mean_low_f, rain_probability) values
${data.daily
  .map(
    (r) =>
      `('${r.city}','${r.month_day}',${r.mean_high_f},${r.mean_low_f},${r.rain_probability})`,
  )
  .join(",\n")}
on conflict (city, month_day) do update set
  mean_high_f = excluded.mean_high_f,
  mean_low_f = excluded.mean_low_f,
  rain_probability = excluded.rain_probability;`;

await Bun.write("/tmp/weather-daily.sql", dailySql);
console.log(`weather-daily.sql: ${data.daily.length} rows`);

const CHUNK = 700;
const chunks: string[] = [];
for (let i = 0; i < data.hourly.length; i += CHUNK) {
  const slice = data.hourly.slice(i, i + CHUNK);
  const sql = `insert into public.weather_hourly
(city, month_day, hour, mean_temp_f, mean_precip_mm, mean_wind_mph) values
${slice
  .map(
    (r) =>
      `('${r.city}','${r.month_day}',${r.hour},${r.mean_temp_f},${r.mean_precip_mm},${r.mean_wind_mph})`,
  )
  .join(",\n")}
on conflict (city, month_day, hour) do update set
  mean_temp_f = excluded.mean_temp_f,
  mean_precip_mm = excluded.mean_precip_mm,
  mean_wind_mph = excluded.mean_wind_mph;`;
  chunks.push(sql);
}

for (let i = 0; i < chunks.length; i++) {
  await Bun.write(`/tmp/weather-hourly-${i}.sql`, chunks[i]);
}
console.log(`weather-hourly: ${chunks.length} chunks of up to ${CHUNK} rows`);
