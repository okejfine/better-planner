"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

function revalidateAll(date: string) {
  revalidatePath("/");
  revalidatePath(`/day/${date}`);
}

export async function setStars(date: string, stars: number | null) {
  const { supabase, user } = await requireUser();
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
  const { supabase, user } = await requireUser();
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
  const { supabase, user } = await requireUser();
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
