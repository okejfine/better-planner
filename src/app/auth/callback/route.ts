import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isEmailAllowed } from "@/lib/auth-allowlist";
import { getSiteUrl } from "@/lib/site-url";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Use the canonical site URL so redirects always point at the correct host,
  // even when EC2 is behind a reverse proxy that rewrites the Host header.
  const siteUrl = getSiteUrl(request);
  const redirectTo = `${siteUrl}${next}`;
  const errorRedirect = `${siteUrl}/login?error=callback`;
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
        return NextResponse.redirect(`${siteUrl}/login?error=not_allowed`);
      }
      return response;
    }
  }

  return NextResponse.redirect(errorRedirect);
}
