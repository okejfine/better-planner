import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SEEDED_PASSWORD = "june12th!";

const SEEDED_USERS = [
  { email: "king@hoth.com", display_name: "King" },
  { email: "kingadamrex@gmail.com", display_name: "Adam" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function seedUser(
  supabase: SupabaseClient<any>,
  email: string,
  display_name: string,
): Promise<{ email: string; action: string; error?: string }> {
  const createResult = await supabase.auth.admin.createUser({
    email,
    password: SEEDED_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name },
  });

  if (!createResult.error) {
    return { email, action: "created" };
  }

  // Fall back to list+update if user already exists.
  const { data: listed, error: listError } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) {
    return { email, action: "error", error: listError.message };
  }

  const existing = listed.users.find(
    (u) => u.email?.toLowerCase() === email,
  );
  if (!existing) {
    return {
      email,
      action: "error",
      error: "User exists but could not be found for password update.",
    };
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    existing.id,
    { password: SEEDED_PASSWORD, email_confirm: true },
  );
  if (updateError) {
    return { email, action: "error", error: updateError.message };
  }

  return { email, action: "updated" };
}

export async function POST() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY is required to seed password users.",
      },
      { status: 500 },
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );

  const results = await Promise.all(
    SEEDED_USERS.map(({ email, display_name }) =>
      seedUser(supabase, email, display_name),
    ),
  );

  const errors = results.filter((r) => r.action === "error");
  if (errors.length > 0) {
    return NextResponse.json(
      { error: errors.map((e) => `${e.email}: ${e.error}`).join("; ") },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, results });
}
