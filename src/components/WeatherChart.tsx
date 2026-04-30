"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { WeatherHourly } from "@/lib/types";
import { CITIES, type CityId } from "@/lib/cities";

type Row = {
  hour: number;
  hourLabel: string;
  lindon?: number;
  highland?: number;
  lehi?: number;
  orem?: number;
  alpine?: number;
};

const COLORS: Record<CityId, string> = {
  lindon: "#0ea5e9",
  highland: "#a855f7",
  lehi: "#f97316",
  orem: "#10b981",
  alpine: "#ef4444",
};

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
            All five cities, by hour of day
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
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
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
              formatter={(value, name) => [
                typeof value === "number" ? `${value.toFixed(1)}°F` : value,
                String(name).charAt(0).toUpperCase() + String(name).slice(1),
              ]}
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
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
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
