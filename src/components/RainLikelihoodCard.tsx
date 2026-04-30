"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { CITIES, type CityId } from "@/lib/cities";
import type { WeatherYearRain } from "@/lib/types";
import { cn } from "@/lib/utils";

const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] as const;
type Year = (typeof YEARS)[number];

// Distinct color per year (qualitative palette).
const YEAR_COLORS: Record<Year, string> = {
  2016: "#0ea5e9",
  2017: "#a855f7",
  2018: "#f97316",
  2019: "#10b981",
  2020: "#ef4444",
  2021: "#facc15",
  2022: "#ec4899",
  2023: "#6366f1",
  2024: "#14b8a6",
  2025: "#84cc16",
};

export function RainLikelihoodCard({
  avgRain,
  yearRain,
}: {
  avgRain: number;
  yearRain: WeatherYearRain[];
}) {
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState<CityId>("lindon");

  const score = Math.round(avgRain * 10);
  const cap = Math.max(0, Math.min(10, score));
  const label =
    cap === 0
      ? "Bone dry historically"
      : cap <= 1
        ? "Very low risk"
        : cap <= 3
          ? "Low risk"
          : cap <= 5
            ? "Moderate risk"
            : cap <= 7
              ? "Wet historically"
              : "Often rains on this date";

  return (
    <div className="mt-3 rounded-xl border border-stone-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center gap-4 text-left hover:bg-stone-50 transition rounded-xl"
        aria-expanded={open}
      >
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wider text-stone-400 font-medium">
            Rain likelihood score (Utah County)
          </div>
          <div className="text-sm text-stone-500 mt-0.5">{label}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-end gap-0.5">
            {Array.from({ length: 10 }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-5 w-1.5 rounded-sm",
                  i < cap ? "bg-blue-400" : "bg-stone-200",
                )}
              />
            ))}
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold tabular-nums text-stone-900">
              {cap}
              <span className="text-stone-400 text-sm font-normal"> / 10</span>
            </div>
            <div className="text-[10px] text-stone-400 uppercase tracking-wider">
              yrs rained
            </div>
          </div>
          <span
            className={cn(
              "ml-1 text-stone-400 transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          >
            ▾
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t border-stone-200 p-4 space-y-3">
          <CityTabs current={city} onChange={setCity} yearRain={yearRain} />
          <YearChart yearRain={yearRain} city={city} />
        </div>
      )}
    </div>
  );
}

function rainyYearsForCity(yearRain: WeatherYearRain[], city: CityId) {
  // Sum hourly precip per year for this city; keep years with >1mm total.
  const totals = new Map<number, number>();
  for (const r of yearRain) {
    if (r.city !== city) continue;
    totals.set(r.year, (totals.get(r.year) ?? 0) + Number(r.precip_mm));
  }
  return Array.from(totals.entries())
    .filter(([, total]) => total > 1.0)
    .map(([year]) => year)
    .sort();
}

function CityTabs({
  current,
  onChange,
  yearRain,
}: {
  current: CityId;
  onChange: (c: CityId) => void;
  yearRain: WeatherYearRain[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CITIES.map((c) => {
        const yearsHit = rainyYearsForCity(yearRain, c.id).length;
        const active = current === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs transition flex items-center gap-2 border",
              active
                ? "bg-stone-900 text-white border-stone-900"
                : "bg-white text-stone-700 border-stone-200 hover:border-stone-400",
            )}
          >
            {c.label}
            <span
              className={cn(
                "tabular-nums text-[10px]",
                active ? "text-stone-300" : "text-stone-400",
              )}
            >
              {yearsHit}/10
            </span>
          </button>
        );
      })}
    </div>
  );
}

function YearChart({
  yearRain,
  city,
}: {
  yearRain: WeatherYearRain[];
  city: CityId;
}) {
  const cityRows = useMemo(
    () => yearRain.filter((r) => r.city === city),
    [yearRain, city],
  );

  const yearsWithRain = useMemo(
    () => rainyYearsForCity(yearRain, city),
    [yearRain, city],
  );

  const dryYears = useMemo(
    () => YEARS.filter((y) => !yearsWithRain.includes(y)),
    [yearsWithRain],
  );

  // Build chart data: 24 hour rows; per-year column with precip_mm or 0.
  const data = useMemo(() => {
    const rows: Array<Record<string, number | string>> = [];
    for (let h = 0; h < 24; h++) {
      const row: Record<string, number | string> = {
        hour: h,
        hourLabel: hourLabel(h),
      };
      for (const y of YEARS) row[String(y)] = 0;
      rows.push(row);
    }
    for (const r of cityRows) {
      rows[r.hour][String(r.year)] = Number(r.precip_mm);
    }
    return rows;
  }, [cityRows]);

  const cityLabel =
    CITIES.find((c) => c.id === city)?.label ?? city;

  if (yearsWithRain.length === 0) {
    return (
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
        Across the past 10 years, <strong>no measurable rain</strong> was
        recorded at any hour on this date in {cityLabel}. Bone dry.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-stone-500">
        Each line is a past year in <strong>{cityLabel}</strong> where the daily
        total was &gt; 1 mm. Y-axis = hourly precipitation in mm.
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ left: -10, right: 8, top: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="hourLabel"
              tick={{ fontSize: 11, fill: "#78716c" }}
              interval={2}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#78716c" }}
              domain={[0, "dataMax + 0.5"]}
              unit="mm"
              width={48}
            />
            <Tooltip
              contentStyle={{
                background: "white",
                border: "1px solid #e7e5e4",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value, name) => [
                typeof value === "number" && value > 0
                  ? `${value.toFixed(2)} mm`
                  : "—",
                String(name),
              ]}
              labelFormatter={(l) => `at ${l}`}
              filterNull
            />
            {yearsWithRain.map((y) => (
              <Line
                key={y}
                type="monotone"
                dataKey={String(y)}
                stroke={YEAR_COLORS[y as Year]}
                strokeWidth={1.7}
                dot={{ r: 2 }}
                isAnimationActive={false}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px]">
        {YEARS.map((y) => {
          const isWet = yearsWithRain.includes(y);
          return (
            <div
              key={y}
              className={cn(
                "flex items-center gap-1.5 tabular-nums",
                isWet ? "text-stone-700" : "text-stone-400",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-3 rounded",
                  !isWet && "opacity-30",
                )}
                style={{ backgroundColor: YEAR_COLORS[y] }}
              />
              {y}
              {!isWet && <span className="italic">dry</span>}
            </div>
          );
        })}
      </div>
      {dryYears.length === 10 && (
        <div className="text-xs text-stone-500 italic">
          No rain in any year. Stays dry.
        </div>
      )}
    </div>
  );
}

function hourLabel(h: number) {
  if (h === 0) return "12a";
  if (h === 12) return "noon";
  if (h < 12) return `${h}a`;
  return `${h - 12}p`;
}
