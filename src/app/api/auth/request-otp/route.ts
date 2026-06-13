import { NextResponse } from "next/server";
import { isEmailAllowed } from "@/lib/auth-allowlist";

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

  return NextResponse.json({ ok: true });
}
