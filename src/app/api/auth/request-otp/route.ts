import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isEmailAllowed } from "@/lib/auth-allowlist";
import { getSiteUrl } from "@/lib/site-url";

type RequestBody = {
  name?: string;
  email?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as RequestBody;
  const email = (body.email ?? "").trim().toLowerCase();
  const name = (body.name ?? "").trim();

  if (!email || !name) {
    return NextResponse.json(
      { error: "Please provide both name and email." },
      { status: 400 },
    );
  }

  if (!isEmailAllowed(email)) {
    return NextResponse.json(
      {
        error:
          "This email is not on the allowlist. Ask the organizer to add it.",
        code: "not_allowed",
      },
      { status: 403 },
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );

  const siteUrl = getSiteUrl(request);
  const emailRedirectTo = `${siteUrl}/auth/callback`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      data: { display_name: name },
    },
  });

  if (error) {
    const lower = error.message.toLowerCase();
    const rateLimited =
      lower.includes("rate limit") ||
      lower.includes("over_email_send_rate_limit");
    return NextResponse.json(
      {
        error: rateLimited
          ? "Email rate limit reached. Please wait a moment and try again."
          : error.message,
        code: rateLimited ? "rate_limited" : "supabase_error",
      },
      { status: rateLimited ? 429 : 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
