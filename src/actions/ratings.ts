"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BYPASS_PROFILE, isBypassAuthEnabled } from "@/lib/auth-mode";
import { CITIES } from "@/lib/cities";
import type { CityId } from "@/lib/cities";

async function requireUser() {
  const supabase = await createClient();
  if (isBypassAuthEnabled()) {
    return { supabase, user: BYPASS_PROFILE, bypass: true as const };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user, bypass: false as const };
}

function revalidateAll(date: string) {
  revalidatePath("/");
  revalidatePath(`/day/${date}`);
}

export async function setStars(date: string, stars: number | null) {
  const { supabase, user, bypass } = await requireUser();
  if (bypass) return;
  if (stars === null) {
    const { error } = await supabase
      .from("day_ratings")
      .upsert({ user_id: user.id, date, stars: null });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("day_ratings")
      .upsert({ user_id: user.id, date, stars });
    if (error) throw error;
  }
  revalidateAll(date);
}

export async function toggleVeto(date: string) {
  const { supabase, user, bypass } = await requireUser();
  if (bypass) return;
  const { data: existing } = await supabase
    .from("day_ratings")
    .select("vetoed")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();
  const next = !existing?.vetoed;
  const { error } = await supabase
    .from("day_ratings")
    .upsert({ user_id: user.id, date, vetoed: next });
  if (error) throw error;
  revalidateAll(date);
}

export async function toggleShortlist(date: string) {
  const { supabase, user, bypass } = await requireUser();
  if (bypass) return;
  const { data: existing } = await supabase
    .from("day_ratings")
    .select("shortlisted")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();
  const next = !existing?.shortlisted;
  const { error } = await supabase
    .from("day_ratings")
    .upsert({ user_id: user.id, date, shortlisted: next });
  if (error) throw error;
  revalidateAll(date);
}

const VALID_CITY_IDS = new Set<string>(CITIES.map((c) => c.id));

export async function setPreferredCities(date: string, cities: CityId[]) {
  const { supabase, user, bypass } = await requireUser();
  if (bypass) return;
  // Validate all submitted ids against the known city list.
  const sanitized = Array.from(new Set(cities))
    .filter((id): id is CityId => VALID_CITY_IDS.has(id))
    .sort();
  const { error } = await supabase
    .from("day_ratings")
    .upsert({ user_id: user.id, date, preferred_cities: sanitized });
  if (error) throw error;
  revalidateAll(date);
}
