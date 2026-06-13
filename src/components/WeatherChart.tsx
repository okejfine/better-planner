"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { WeatherHourly } from "@/lib/types";
import { CITIES, type CityId } from "@/lib/cities";

type Row = {
  hour: number;
  hourLabel: string;
  [city: string]: number | string;
};

const CITY_PALETTE = [
  "#0ea5e9",
  "#a855f7",
  "#f97316",
  "#10b981",
  "#ef4444",
  "#f59e0b",
  "#14b8a6",
  "#6366f1",
  "#ec4899",
  "#84cc16",
  "#8b5cf6",
  "#06b6d4",
];

const COLORS = CITIES.reduce(
  (acc, city, idx) => {
    acc[city.id] = CITY_PALETTE[idx % CITY_PALETTE.length];
    return acc;
  },
  {} as Record<CityId, string>,
);

export function WeatherChart({ rows }: { rows: WeatherHourly[] }) {
  const byHour = new Map<number, Row>();
  for (let h = 0; h < 24; h++) {
    byHour.set(h, {
      hour: h,
      hourLabel: hourLabel(h),
    });
  }
  for (const r of rows) {
    const row = byHour.get(r.hour);
    if (!row) continue;
    (row as unknown as Record<string, number>)[r.city] = Number(r.mean_temp_f);
  }
  const data = Array.from(byHour.values());

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <div className="text-sm font-medium text-stone-900">
            Hourly temperature (10-year average)
          </div>
          <div className="text-xs text-stone-500">
            All selected cities, by hour of day
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {CITIES.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-1.5 text-[11px] text-stone-600"
            >
              <span
                className="h-1.5 w-3 rounded"
                style={{ backgroundColor: COLORS[c.id] }}
              />
              {c.label}
            </div>
          ))}
        </div>
      </div>
      <div className="h-64 w-full min-h-64">
        <LineChart
          responsive
          width="100%"
          height="100%"
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
            domain={["auto", "auto"]}
            unit="°"
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "white",
              border: "1px solid #e7e5e4",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value, name) => {
              const city = CITIES.find((c) => c.id === name);
              return [
                typeof value === "number" ? `${value.toFixed(1)}°F` : value,
                city?.label ?? String(name),
              ];
            }}
            labelFormatter={(l) => `at ${l}`}
          />
          {CITIES.map((c) => (
            <Line
              key={c.id}
              type="monotone"
              dataKey={c.id}
              stroke={COLORS[c.id]}
              strokeWidth={1.8}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </LineChart>
      </div>
    </div>
  );
}

function hourLabel(h: number) {
  if (h === 0) return "12a";
  if (h === 12) return "noon";
  if (h < 12) return `${h}a`;
  return `${h - 12}p`;
}
