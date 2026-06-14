"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isBypassAuthEnabled, BYPASS_PROFILE } from "@/lib/auth-mode";
import { ensureUserProfile } from "@/lib/supabase/ensure-user-profile";
import { isAdmin } from "@/lib/admin";
import { CITIES } from "@/lib/cities";
import type { CityId } from "@/lib/cities";
import type { WeddingEventRow } from "@/lib/types";

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

// ── Final date ────────────────────────────────────────────────────────────────

export async function setFinalDate(date: string | null) {
  const { supabase, user, bypass } = await requireUser();
  if (bypass) return;

  const email = "email" in user ? (user.email ?? "") : "";
  if (!isAdmin(email)) throw new Error("Not authorized");

  const { error } = await supabase.from("wedding_settings").upsert(
    {
      id: 1,
      final_date: date,
      set_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message ?? "Could not update final date");
  revalidatePath("/");
  revalidatePath("/wedding-events");
  revalidatePath("/day/[date]");
}

// ── Wedding sub-events ────────────────────────────────────────────────────────

const VALID_KINDS = [
  "ceremony",
  "reception",
  "dinner",
  "shower",
  "brunch",
  "party",
  "custom",
] as const;

function validateKind(kind: string): string {
  return (VALID_KINDS as readonly string[]).includes(kind) ? kind : "custom";
}

function validateLocation(loc: string | null | undefined): CityId | null {
  if (!loc) return null;
  return CITIES.some((c) => c.id === loc) ? (loc as CityId) : null;
}

export async function addWeddingEvent(
  formData: FormData,
): Promise<{ error?: string; event?: WeddingEventRow }> {
  try {
    const { supabase, user, bypass } = await requireUser();
    if (bypass) return { error: "Auth bypass: cannot add events in bypass mode" };

    const kind = validateKind(String(formData.get("kind") ?? "custom"));
    const title = String(formData.get("title") ?? "").trim().slice(0, 100);
    if (!title) return { error: "Title is required" };

    const location = validateLocation(formData.get("location") as string | null);
    const event_date = (formData.get("event_date") as string) || null;
    const event_time = (formData.get("event_time") as string) || null;
    const notes =
      ((formData.get("notes") as string) ?? "").trim().slice(0, 500) || null;

    const { data, error } = await supabase
      .from("wedding_events")
      .insert({
        kind,
        title,
        location,
        event_date,
        event_time,
        notes,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return { error: error.message ?? "Could not create event" };
    revalidatePath("/wedding-events");
    return { event: data as WeddingEventRow };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateWeddingEvent(
  id: string,
  formData: FormData,
): Promise<{ error?: string; event?: WeddingEventRow }> {
  try {
    const { supabase, bypass } = await requireUser();
    if (bypass) return { error: "Auth bypass: cannot update events in bypass mode" };

    const title = String(formData.get("title") ?? "").trim().slice(0, 100);
    if (!title) return { error: "Title cannot be empty" };

    const updates: Record<string, unknown> = {
      title,
      location: validateLocation(formData.get("location") as string | null),
      event_date: (formData.get("event_date") as string) || null,
      event_time: (formData.get("event_time") as string) || null,
      notes:
        ((formData.get("notes") as string) ?? "").trim().slice(0, 500) || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("wedding_events")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return { error: error.message ?? "Could not update event" };
    revalidatePath("/wedding-events");
    return { event: data as WeddingEventRow };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function deleteWeddingEvent(
  id: string,
): Promise<{ error?: string }> {
  try {
    const { supabase, user, bypass } = await requireUser();
    if (bypass) return { error: "Auth bypass: cannot delete events in bypass mode" };

    const email = "email" in user ? (user.email ?? "") : "";

    const query = supabase.from("wedding_events").delete().eq("id", id);
    const { error } = isAdmin(email)
      ? await query
      : await query.eq("created_by", user.id);

    if (error) return { error: error.message ?? "Could not delete event" };
    revalidatePath("/wedding-events");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ── iCal import ───────────────────────────────────────────────────────────────

export async function clearImportedEvents() {
  const { supabase, user, bypass } = await requireUser();
  if (bypass) return;
  await supabase.from("imported_events").delete().eq("user_id", user.id);
  revalidatePath("/");
}
