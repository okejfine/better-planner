/**
 * Resolves the canonical public URL for this deployment.
 *
 * Resolution order (first defined wins):
 *   1. SITE_URL          — set in runtime.env on the server; never baked into the build.
 *   2. NEXT_PUBLIC_SITE_URL — baked in at build time; falls back for older deploys.
 *   3. x-forwarded-* headers from the request — useful behind a reverse proxy.
 *   4. request.url origin — last resort; can be "localhost" in some infra setups.
 *
 * Strip any trailing slash so callers can safely concatenate paths with "/…".
 */
export function getSiteUrl(request?: Request): string {
  const fromEnv =
    process.env.SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  if (request) {
    const forwarded = getForwardedOrigin(request);
    if (forwarded) return forwarded;

    try {
      const { origin } = new URL(request.url);
      return origin;
    } catch {
      // malformed URL — fall through
    }
  }

  // Hard fallback so auth links are never silent about a misconfiguration.
  return "http://localhost:3000";
}

function getForwardedOrigin(request: Request): string | null {
  const proto =
    request.headers.get("x-forwarded-proto") ||
    request.headers.get("x-forwarded-scheme");
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host");

  if (proto && host) {
    // x-forwarded-proto may contain a comma-separated list; take the first.
    const scheme = proto.split(",")[0].trim();
    return `${scheme}://${host}`;
  }

  return null;
}
