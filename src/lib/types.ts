import type { CityId } from "@/lib/cities";

export type WeddingSettings = {
  id: number;
  final_date: string | null;
  set_by: string | null;
  updated_at: string;
};

export type WeddingEventRow = {
  id: string;
  kind: string;
  title: string;
  location: CityId | null;
  event_date: string | null;
  event_time: string | null;
  notes: string | null;
  created_by: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ImportedEventRow = {
  id: string;
  user_id: string;
  date: string;
  title: string;
  uid: string;
  source_filename: string | null;
  created_at: string;
};

export type ImportedEventForDisplay = {
  id: string;
  user_id: string;
  title: string;
  avatar_color: string;
};

export type EventKind =
  | "byu_football_home"
  | "byu_football_away"
  | "lone_peak_home"
  | "lone_peak_away"
  | "federal_holiday"
  | "holiday"
  | "lds_conference"
  | "custom";

export type EventRow = {
  id: string;
  date: string; // YYYY-MM-DD
  kind: EventKind;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  email: string;
  display_name: string;
  avatar_color: string;
};

export type DayRating = {
  user_id: string;
  date: string;
  stars: number | null;
  vetoed: boolean;
  shortlisted: boolean;
  preferred_cities: CityId[];
};

export type CommentRow = {
  id: string;
  date: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};

export type WeatherDaily = {
  city: CityId;
  month_day: string; // 'MMDD'
  mean_high_f: number;
  mean_low_f: number;
  rain_probability: number; // 0..1
};

export type WeatherYearRain = {
  city: CityId;
  month_day: string;
  hour: number;
  year: number;
  precip_mm: number;
};

export type WeatherHourly = {
  city: CityId;
  month_day: string;
  hour: number;
  mean_temp_f: number;
  mean_precip_mm: number;
  mean_wind_mph: number;
  years_with_rain: number; // 0..10
};
