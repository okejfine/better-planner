import { addDays, format, startOfMonth, endOfMonth, getDay } from "date-fns";

export const WINDOW_YEAR = 2026;
export const WINDOW_MONTHS = [8, 9, 10] as const;
export const WINDOW_MONTH_KEYS = ["2026-08", "2026-09", "2026-10"] as const;
export type WindowMonthKey = (typeof WINDOW_MONTH_KEYS)[number];

export function parseMonthKey(input: string | undefined | null): WindowMonthKey {
  if (input && (WINDOW_MONTH_KEYS as readonly string[]).includes(input)) {
    return input as WindowMonthKey;
  }
  return WINDOW_MONTH_KEYS[0];
}

export function adjacentMonths(key: WindowMonthKey): {
  prev: WindowMonthKey | null;
  next: WindowMonthKey | null;
} {
  const idx = WINDOW_MONTH_KEYS.indexOf(key);
  return {
    prev: idx > 0 ? WINDOW_MONTH_KEYS[idx - 1] : null,
    next:
      idx < WINDOW_MONTH_KEYS.length - 1 ? WINDOW_MONTH_KEYS[idx + 1] : null,
  };
}

export function monthKeyToCalendarMonth(key: WindowMonthKey): CalendarMonth {
  const [y, m] = key.split("-").map(Number);
  return buildCalendarMonth(y, m);
}

export type Iso = string; // 'YYYY-MM-DD'

export function toIso(date: Date): Iso {
  return format(date, "yyyy-MM-dd");
}

export function toMonthDay(date: Date | Iso): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMdd");
}

export function fromIso(iso: Iso): Date {
  // Construct a local date so timezone shifting can't move the day.
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export type CalendarMonth = {
  year: number;
  month: number; // 1-indexed
  label: string; // 'August 2026'
  weeks: Array<Array<Iso | null>>; // 6 rows of 7
};

export function buildCalendarMonth(year: number, month: number): CalendarMonth {
  const first = new Date(year, month - 1, 1);
  const last = endOfMonth(first);
  const startWeekday = getDay(first); // 0=Sun
  const totalDays = last.getDate();
  const cells: Array<Iso | null> = [];

  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) {
    cells.push(toIso(new Date(year, month - 1, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length / 7 < 6) {
    for (let i = 0; i < 7; i++) cells.push(null);
  }

  const weeks: Array<Array<Iso | null>> = [];
  for (let r = 0; r < 6; r++) {
    weeks.push(cells.slice(r * 7, r * 7 + 7));
  }

  return {
    year,
    month,
    label: format(first, "MMMM yyyy"),
    weeks,
  };
}

export function buildWindow(): CalendarMonth[] {
  return WINDOW_MONTHS.map((m) => buildCalendarMonth(WINDOW_YEAR, m));
}

export function isInWindow(iso: Iso): boolean {
  const d = fromIso(iso);
  return (
    d.getFullYear() === WINDOW_YEAR &&
    (WINDOW_MONTHS as readonly number[]).includes(d.getMonth() + 1)
  );
}

export function eachDateInWindow(): Iso[] {
  const out: Iso[] = [];
  const start = new Date(WINDOW_YEAR, WINDOW_MONTHS[0] - 1, 1);
  const end = endOfMonth(
    new Date(WINDOW_YEAR, WINDOW_MONTHS[WINDOW_MONTHS.length - 1] - 1, 1),
  );
  for (let d = start; d <= end; d = addDays(d, 1)) {
    out.push(toIso(d));
  }
  return out;
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
