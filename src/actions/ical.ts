"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isBypassAuthEnabled, BYPASS_PROFILE } from "@/lib/auth-mode";
import { ensureUserProfile } from "@/lib/supabase/ensure-user-profile";
import { isInWindow } from "@/lib/dates";

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

// ── Minimal ICS parser ────────────────────────────────────────────────────────

type IcalEvent = { uid: string; summary: string; dtstart: string };

function extractLineProp(block: string, name: string): string | null {
  // Handles  PROP:value  and  PROP;param=x:value
  const re = new RegExp(`^${name}(?:;[^:]*)?:(.+)$`, "m");
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

function extractDate(block: string): string | null {
  const raw = extractLineProp(block, "DTSTART");
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 8);
  if (digits.length < 8) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function parseIcalText(text: string): IcalEvent[] {
  // Unfold continuation lines (RFC 5545 §3.1)
  const unfolded = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]/g, "");

  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];
  const events: IcalEvent[] = [];

  for (const block of blocks) {
    const dtstart = extractDate(block);
    if (!dtstart) continue;
    const uid =
      extractLineProp(block, "UID") ?? `uid-${Math.random().toString(36).slice(2)}`;
    const summary = extractLineProp(block, "SUMMARY") ?? "(no title)";
    events.push({ uid, summary, dtstart });
  }

  return events;
}

// ── Server action ─────────────────────────────────────────────────────────────

export async function importIcal(
  fileText: string,
  sourceFilename: string,
): Promise<{ imported: number; skipped: number }> {
  const { supabase, user, bypass } = await requireUser();
  if (bypass) return { imported: 0, skipped: 0 };

  const parsed = parseIcalText(fileText);

  // Filter to planning window
  const inWindow = parsed.filter((e) => isInWindow(e.dtstart));
  const skipped = parsed.length - inWindow.length;

  if (inWindow.length === 0) {
    return { imported: 0, skipped: parsed.length };
  }

  // Replace strategy: delete previous import by this user, then insert
  await supabase.from("imported_events").delete().eq("user_id", user.id);

  const rows = inWindow.map((e) => ({
    user_id: user.id,
    date: e.dtstart,
    title: e.summary.slice(0, 200),
    uid: e.uid,
    source_filename: sourceFilename.slice(0, 200),
  }));

  const { error } = await supabase.from("imported_events").insert(rows);
  if (error) throw new Error(error.message ?? "Could not save calendar events");

  revalidatePath("/");
  return { imported: inWindow.length, skipped };
}
