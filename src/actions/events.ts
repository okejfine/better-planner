"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BYPASS_PROFILE, isBypassAuthEnabled } from "@/lib/auth-mode";
import { ensureUserProfile } from "@/lib/supabase/ensure-user-profile";

type SupabaseErrorShape = {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message?: string;
};

function formatEventWriteError(error: SupabaseErrorShape) {
  if (error.code === "23503") {
    return "Your account profile was out of sync. Please try saving again.";
  }
  if (error.code === "42501") {
    return "You are not allowed to save this event. If this keeps happening, run the latest database migration.";
  }
  return error.message ?? "Could not save event.";
}

async function requireUser() {
  const supabase = await createClient();
  if (isBypassAuthEnabled()) {
    return { supabase, user: BYPASS_PROFILE, bypass: true as const };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  await ensureUserProfile(user);
  return { supabase, user, bypass: false as const };
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
  const { supabase, user, bypass } = await requireUser();
  if (bypass) return;
  const { error } = await supabase.from("events").insert({
    date,
    kind: "custom",
    title: trimmed,
    description: desc,
    created_by: user.id,
  });
  if (error) throw new Error(formatEventWriteError(error));
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
  const { supabase, user, bypass } = await requireUser();
  if (bypass) return;
  const { data, error } = await supabase
    .from("events")
    .update({ title: trimmedTitle, description: desc })
    .eq("id", id)
    .eq("kind", "custom")
    .eq("created_by", user.id)
    .select("id");
  if (error) throw new Error(formatEventWriteError(error));
  if (!data || data.length === 0) {
    throw new Error("Not authorized to edit this event.");
  }
  revalidatePath("/");
  revalidatePath(`/day/${date}`);
}

export async function deleteCustomEvent(id: string, date: string) {
  const { supabase, user, bypass } = await requireUser();
  if (bypass) return;
  const { data, error } = await supabase
    .from("events")
    .delete()
    .eq("id", id)
    .eq("kind", "custom")
    .eq("created_by", user.id)
    .select("id");
  if (error) throw new Error(formatEventWriteError(error));
  if (!data || data.length === 0) {
    throw new Error("Not authorized to delete this event.");
  }
  revalidatePath("/");
  revalidatePath(`/day/${date}`);
}
