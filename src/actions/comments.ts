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

const MAX_COMMENT = 1000;

export async function addComment(
  date: string,
  body: string,
  parentId?: string,
) {
  const trimmed = body.trim().slice(0, MAX_COMMENT);
  if (!trimmed) return;
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("comments").insert({
    date,
    user_id: user.id,
    parent_id: parentId ?? null,
    body: trimmed,
  });
  if (error) throw error;
  revalidatePath("/");
  revalidatePath(`/day/${date}`);
}

export async function deleteComment(id: string, date: string) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Not authorized to delete this comment.");
  }
  revalidatePath("/");
  revalidatePath(`/day/${date}`);
}
