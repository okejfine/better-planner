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

const MAX_TITLE = 60;
const MAX_DESCRIPTION = 280;

export async function addCustomEvent(
  date: string,
  title: string,
  description?: string,
) {
  const trimmed = title.trim().slice(0, MAX_TITLE);
  if (!trimmed) return;
  const desc = description?.trim().slice(0, MAX_DESCRIPTION) || null;
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("events").insert({
    date,
    kind: "custom",
    title: trimmed,
    description: desc,
    created_by: user.id,
  });
  if (error) throw error;
  revalidatePath("/");
  revalidatePath(`/day/${date}`);
}


export async function editCustomEvent(
  id: string,
  date: string,
  title: string,
  description?: string,
) {
  const trimmedTitle = title.trim().slice(0, MAX_TITLE);
  if (!trimmedTitle) throw new Error("Title can't be empty.");
  const desc = description?.trim().slice(0, MAX_DESCRIPTION) || null;
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("events")
    .update({ title: trimmedTitle, description: desc })
    .eq("id", id)
    .eq("kind", "custom")
    .eq("created_by", user.id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Not authorized to edit this event.");
  }
  revalidatePath("/");
  revalidatePath(`/day/${date}`);
}

export async function deleteCustomEvent(id: string, date: string) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("events")
    .delete()
    .eq("id", id)
    .eq("kind", "custom")
    .eq("created_by", user.id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Not authorized to delete this event.");
  }
  revalidatePath("/");
  revalidatePath(`/day/${date}`);
}
