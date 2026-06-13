import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isEmailAllowed } from "@/lib/auth-allowlist";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const redirectTo = `${origin}${next}`;
  const errorRedirect = `${origin}/login?error=callback`;
  const response = NextResponse.redirect(redirectTo);

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email || !isEmailAllowed(user.email)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=not_allowed`);
      }
      return response;
    }
  }

  return NextResponse.redirect(errorRedirect);
}
