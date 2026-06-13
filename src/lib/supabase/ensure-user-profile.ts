import "server-only";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

function fallbackDisplayName(user: User) {
  return (
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Guest"
  );
}

function normalizeProfileWriteError(error: { code?: string; message?: string }) {
  if (error.code === "23503") {
    return "Your account profile was missing. Please try again.";
  }
  if (error.code === "42501") {
    return "You do not have permission to save events yet. Ask the owner to run the latest database migration.";
  }
  return error.message ?? "Could not prepare your profile for saving.";
}

function isProfilesTableMissing(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    message.includes("public.profiles") ||
    message.includes("schema cache")
  );
}

export async function ensureUserProfile(user: User) {
  const supabase = await createClient();
  const displayName = fallbackDisplayName(user);
  const payload = {
    id: user.id,
    email: user.email ?? "",
    display_name: displayName,
  };

  const { error } = await supabase.from("profiles").upsert(payload, {
    onConflict: "id",
  });
  if (!error) return;
  if (isProfilesTableMissing(error)) return;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !url) {
    throw new Error(normalizeProfileWriteError(error));
  }

  const admin = createAdminClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: adminError } = await admin.from("profiles").upsert(payload, {
    onConflict: "id",
  });
  if (adminError && isProfilesTableMissing(adminError)) return;
  if (adminError) {
    throw new Error(normalizeProfileWriteError(adminError));
  }
}
