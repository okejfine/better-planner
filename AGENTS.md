<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

## Project: Better Planner

Collaborative wedding date picker for an Aug–Oct 2026 wedding. A small group of users (couple + families) rate, veto, shortlist, and comment on candidate dates against historical weather, BYU football, federal holidays, and LDS General Conference.

**Stack:** Next.js 16 App Router · TypeScript · Tailwind v4 · Supabase (Postgres + Auth) · Recharts  
**Hosting:** EC2 t4g.nano (arm64 standalone build, Caddy reverse proxy, systemd)

---

## Authentication

- **Open signup** — any email can sign in. There is no allowlist.
- **Magic link** (`POST /api/auth/request-otp`) sends a Supabase OTP email; `/auth/callback` exchanges the code for a session.
- **Password** login goes directly through `supabase.auth.signInWithPassword` on the client.
- **`BYPASS_AUTH=true`** skips all auth and injects a fixed dev profile — useful for local dev without Supabase.
- **Proxy, not middleware** — Next.js 16 uses `src/proxy.ts` + `src/lib/supabase/proxy.ts` instead of `middleware.ts`. The proxy checks for a valid session and redirects unauthenticated requests to `/login`.
- **Admin features** (set final date, manage wedding sub-events) are restricted to emails in `ADMIN_EMAILS`.

---

## Key environment variables

| Variable | Where set | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` (build-time) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local` (build-time) | Supabase anon key |
| `NEXT_PUBLIC_SITE_URL` | `.env.local` (build-time) | Fallback site URL for auth redirects |
| `SUPABASE_SERVICE_ROLE_KEY` | `runtime.env` (server-side) | Service role key for admin/seed operations |
| `SITE_URL` | `runtime.env` (server-side) | Authoritative site URL used in magic-link emails |
| `ADMIN_EMAILS` | `runtime.env` or `.env.local` | Comma-separated emails with admin UI access |
| `BYPASS_AUTH` | `.env.local` | Set `true` to skip auth in local dev |

`NEXT_PUBLIC_*` vars are inlined at build time. `SITE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are runtime-only and live in `runtime.env` on the server (loaded by the systemd unit via `EnvironmentFile`).

---

## Database migrations

Apply in order (`supabase/migrations/`):

| File | Adds |
|---|---|
| `0001_init.sql` | profiles, ratings, comments, custom events |
| `0002_add_city_options.sql` | per-day city preferences |
| `0003_complete_schema.sql` | RLS policies, indexes |
| `0004_event_kinds_holiday_lds.sql` | event kind enum |
| `0005_day_rating_preferred_cities.sql` | day-level ratings, shortlist, veto |
| `0006_wedding_settings.sql` | wedding_settings (final date) + `is_admin()` helper |
| `0007_wedding_events.sql` | wedding_events (ceremony, reception, dinner, etc.) |
| `0008_imported_events.sql` | imported_events (iCal upload, per-user replace) |

---

## Deployment workflow

```bash
# From your Mac (arm64 = matches EC2 Graviton):
EC2_HOST=ec2-user@<ip> SSH_KEY=~/.ssh/better-planner-key.pem ./deploy/deploy.sh
```

`deploy.sh` builds the Next.js standalone bundle locally, rsyncs it to EC2, and restarts the systemd service (`better-planner.service`). The service loads secrets from `~/better-planner/runtime.env` via `EnvironmentFile`.

See `deploy/README.md` for first-time server setup, Caddy config, swap, and Supabase redirect URL configuration.

---

## Important patterns

- **Server actions** live in `src/actions/` — use `createServerClient` from `@supabase/ssr` via `src/lib/supabase/server.ts`.
- **RSC data fetching** is in `src/lib/queries.ts`.
- **Shared types** are in `src/lib/types.ts`.
- **`ensure-user-profile`** (`src/lib/supabase/ensure-user-profile.ts`) is called after login to create a `profiles` row if one doesn't exist.
- **Theme system** — 4 themes (light/dark/clang/alex) cycled via `ThemeProvider` + `ThemeToggle`; persisted to `localStorage`; applied before first paint to prevent flash.
