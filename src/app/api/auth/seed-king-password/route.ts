import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SEEDED_EMAIL = "king@hoth.com";
const SEEDED_PASSWORD = "june12th!";

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

  const createResult = await supabase.auth.admin.createUser({
    email: SEEDED_EMAIL,
    password: SEEDED_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: "King" },
  });

  if (!createResult.error) {
    return NextResponse.json({ ok: true, action: "created" });
  }
  // Supabase may return different duplicate-user strings by version/provider.
  // Instead of string-matching brittle messages, fall back to list+update path.

  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 400 });
  }

  const existing = listed.users.find(
    (user) => user.email?.toLowerCase() === SEEDED_EMAIL,
  );
  if (!existing) {
    return NextResponse.json(
      {
        error:
          "User exists but could not be found for password update. Try again.",
      },
      { status: 500 },
    );
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    existing.id,
    {
      password: SEEDED_PASSWORD,
      email_confirm: true,
    },
  );
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, action: "updated" });
}
