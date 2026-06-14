# Better Planner

Collaborative date picker for an Aug–Oct 2026 wedding.

- **Stack:** Next.js 16 (App Router) + TypeScript + Tailwind v4 + @supabase/ssr + Recharts
- **Backend:** Supabase Postgres + Auth (magic-link + password, open signup)
- **Data:** 10-yr historical weather for configured cities (Open-Meteo); BYU 2026 football; federal holidays; Halloween; LDS General Conference
- **Hosting:** EC2 t4g.nano (arm64 standalone build, systemd service)

---

## Prerequisites

- Bun 1.1+
- A Supabase project (URL, publishable key, service role key)

## Run locally

```bash
bun install
bun run dev
# http://localhost:3000
```

Create `./.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
BYPASS_AUTH=false
SUPABASE_SERVICE_ROLE_KEY=...
```

### Auth options

| Env var | Purpose |
|---|---|
| `BYPASS_AUTH=true` | Skip auth entirely (local dev shortcut). Injects a fixed dev profile. |

Sign in with magic-link **or** password. Any email can sign up — there is no allowlist. Password reset sends a reset email → `/reset-password`.

Dev seed endpoint: `POST /api/auth/seed-king-password` sets `king@hoth.com` to password `june12th!` (requires `SUPABASE_SERVICE_ROLE_KEY`).

---

## Project layout

```
src/
├── proxy.ts                  Next.js 16 custom proxy (replaces middleware — handles session + auth redirects)
├── app/
│   ├── page.tsx                  home — calendar + dashboard
│   ├── login/page.tsx            magic-link + password login
│   ├── reset-password/page.tsx   password reset landing
│   ├── day/[date]/page.tsx       day detail — weather, events, ratings, comments
│   ├── wedding-events/page.tsx   wedding sub-events manager (ceremony, reception, etc.)
│   ├── api/auth/
│   │   ├── request-otp/          POST — send magic link
│   │   └── seed-king-password/   POST — dev seed (service role only)
│   └── auth/{callback,signout}/  Supabase OAuth callbacks
├── components/
│   ├── Header.tsx                sticky header + ThemeToggle
│   ├── CalendarGrid.tsx          month grid
│   ├── MonthNav.tsx              previous/next month navigation
│   ├── DayTile.tsx               day cell (weather, events, stars)
│   ├── CalendarEventButton.tsx   calendar event view/delete dialog
│   ├── AddEventDialog.tsx        add event modal (dashboard)
│   ├── AddCustomEvent.tsx        add event inline (day page)
│   ├── CustomEventItem.tsx       display + delete for a custom event
│   ├── Dashboard.tsx             shortlist + leaderboard
│   ├── Leaderboard.tsx           ranked date leaderboard
│   ├── StarsRow.tsx              read-only star display
│   ├── StarRatingInput.tsx       interactive star rating input
│   ├── CommentThread.tsx         per-day comment thread
│   ├── PreferredCitiesInput.tsx  per-day city preference picker
│   ├── WeatherChart.tsx          hourly weather chart
│   ├── RainLikelihoodCard.tsx    rain-likelihood breakdown
│   ├── EventBar.tsx              event pill (kind-coloured)
│   ├── Toggles.tsx               star / shortlist / veto
│   ├── SetFinalDateButton.tsx    admin button to lock in the wedding date
│   ├── WeddingEventsManager.tsx  CRUD manager for wedding sub-events
│   ├── IcalDropzone.tsx          iCal file upload + import
│   ├── HelpButton.tsx            contextual help popover
│   └── theme/
│       ├── ThemeProvider.tsx     cycling theme context (light/dark/clang/alex)
│       └── ThemeToggle.tsx       header toggle button
├── actions/                      server actions
│   ├── ratings.ts                star ratings + shortlist + veto
│   ├── comments.ts               per-day comments
│   ├── events.ts                 custom calendar events
│   ├── wedding.ts                wedding settings (final date) + wedding sub-events
│   └── ical.ts                   iCal import (parse + upsert imported_events)
├── lib/
│   ├── supabase/                 client / server / proxy / ensure-user-profile
│   ├── auth-mode.ts              BYPASS_AUTH helpers
│   ├── admin.ts                  ADMIN_EMAILS — controls admin-only UI (set final date, etc.)
│   ├── confetti.ts               rose 🌹 confetti for clang mode
│   ├── queries.ts                RSC data fetchers
│   ├── dates.ts                  calendar window helpers
│   ├── cities.ts                 city lat/lon table
│   └── types.ts                  shared types
supabase/migrations/
├── 0001_init.sql                 profiles, ratings, comments, custom events
├── 0002_add_city_options.sql     per-day city preferences
├── 0003_complete_schema.sql      RLS policies, indexes
├── 0004_event_kinds_holiday_lds.sql  event kind enum (holiday, lds_conference, byu_football, custom)
├── 0005_day_rating_preferred_cities.sql  day-level ratings + shortlist + veto
├── 0006_wedding_settings.sql     wedding_settings table (final date) + is_admin() helper
├── 0007_wedding_events.sql       wedding_events table (ceremony, reception, dinner, etc.)
└── 0008_imported_events.sql      imported_events table (iCal upload, per-user replace strategy)
scripts/
├── pull-weather.ts               Open-Meteo archive pull → /tmp/wedding-weather.json
├── apply-weather.ts              upsert weather JSON via service role
├── build-weather-sql.ts          JSON → SQL chunk emitter (alt apply path)
└── seed-events.ts                BYU football + holidays + LDS conference
deploy/
├── deploy.sh                     build locally, rsync to EC2, restart service
├── better-planner.service        systemd unit
└── README.md                     EC2 setup + TLS guide
```

---

## Themes

The header has a cycling theme toggle (☀️ → 🌙 → 🌹 → ✦):

| Mode | Description |
|---|---|
| **Light** | Default stone/warm-white palette, Chakra Petch font |
| **Dark** | Inverted zinc near-black palette |
| **Clang** | Rose/pink ramp, Pacifico + Quicksand fonts, 🌹 confetti on event save |
| **Alex** | Teal near-black (`#060A0C`–`#BEE3E5`), Space Grotesk + Inter + IBM Plex Mono |

Theme is persisted to `localStorage` and applied before first paint to prevent flash.

---

## Migrations

Apply in order before running in a new environment:

```bash
# In Supabase dashboard → SQL Editor, run each file in order:
supabase/migrations/0001_init.sql
supabase/migrations/0002_add_city_options.sql
supabase/migrations/0003_complete_schema.sql
supabase/migrations/0004_event_kinds_holiday_lds.sql
supabase/migrations/0005_day_rating_preferred_cities.sql
supabase/migrations/0006_wedding_settings.sql
supabase/migrations/0007_wedding_events.sql
supabase/migrations/0008_imported_events.sql
```

---

## Seeding weather + events

```bash
# Pull 10-yr historical weather from Open-Meteo:
bun run scripts/pull-weather.ts        # → /tmp/wedding-weather.json
bun run scripts/apply-weather.ts       # upserts via SUPABASE_SERVICE_ROLE_KEY

# Seed calendar events (BYU football, federal holidays, Halloween, LDS conference):
bun run scripts/seed-events.ts
```

`0004_event_kinds_holiday_lds.sql` must be applied before seeding — the script
skips `holiday`/`lds_conference` rows if the migration hasn't run.

---

## Admin features

Certain UI actions (setting the final wedding date, managing wedding sub-events) are restricted to admin users. Set the `ADMIN_EMAILS` env var to a comma-separated list of email addresses:

```bash
ADMIN_EMAILS=king@hoth.com,alexsking77@gmail.com
```

Non-admin users see the calendar and can rate/comment but cannot set the final date.

---

## Deploy

Build locally (Apple Silicon = arm64, matches EC2 Graviton) and ship the artifact:

```bash
EC2_HOST=ec2-user@<ip> SSH_KEY=~/.ssh/better-planner-key.pem ./deploy/deploy.sh
```

The script builds the Next.js standalone bundle, rsyncs it to the server, and
restarts the systemd service. See `deploy/README.md` for first-time server setup,
TLS with Caddy, and swap configuration.
