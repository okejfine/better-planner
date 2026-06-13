# Better Planner

Collaborative date picker for an Aug–Oct 2026 wedding.

- **Stack:** Next.js 16 (App Router) + TypeScript + Tailwind v4 + @supabase/ssr + Recharts
- **Backend:** Supabase Postgres + Auth (magic-link + password, allowlist-gated)
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
AUTH_EMAIL_ALLOWLIST=alice@example.com,bob@example.com
SUPABASE_SERVICE_ROLE_KEY=...
```

### Auth options

| Env var | Purpose |
|---|---|
| `AUTH_EMAIL_ALLOWLIST` | Comma/newline/semicolon-separated emails allowed to log in. Empty = open signup. |
| `BYPASS_AUTH=true` | Skip auth entirely (local dev shortcut). Injects a fixed dev profile. |

Sign in with magic-link **or** password. Password reset sends a reset email → `/reset-password`.

Dev seed endpoint: `POST /api/auth/seed-king-password` sets `king@hoth.com` to password `june12th!` (requires `SUPABASE_SERVICE_ROLE_KEY`).

---

## Project layout

```
src/
├── app/
│   ├── page.tsx                  home — calendar + dashboard
│   ├── login/page.tsx            magic-link + password login
│   ├── reset-password/page.tsx   password reset landing
│   ├── day/[date]/page.tsx       day detail — weather, events, ratings, comments
│   ├── api/auth/
│   │   ├── request-otp/          POST — send magic link
│   │   └── seed-king-password/   POST — dev seed (service role only)
│   └── auth/{callback,signout}/  Supabase OAuth callbacks
├── components/
│   ├── Header.tsx                sticky header + ThemeToggle
│   ├── CalendarGrid.tsx          month grid
│   ├── DayTile.tsx               day cell (weather, events, stars)
│   ├── CalendarEventButton.tsx   calendar event view/delete dialog
│   ├── AddEventDialog.tsx        add event modal (dashboard)
│   ├── AddCustomEvent.tsx        add event inline (day page)
│   ├── Dashboard.tsx             shortlist + leaderboard
│   ├── PreferredCitiesInput.tsx  per-day city preference picker
│   ├── WeatherChart.tsx          hourly weather chart
│   ├── RainLikelihoodCard.tsx    rain-likelihood breakdown
│   ├── EventBar.tsx              event pill (kind-coloured)
│   ├── Toggles.tsx               star / shortlist / veto
│   └── theme/
│       ├── ThemeProvider.tsx     cycling theme context (light/dark/clang/alex)
│       └── ThemeToggle.tsx       header toggle button
├── actions/                      server actions: ratings, comments, events
├── lib/
│   ├── supabase/                 client / server / proxy / ensure-user-profile
│   ├── auth-mode.ts              BYPASS_AUTH helpers
│   ├── auth-allowlist.ts         allowlist parsing + isEmailAllowed()
│   ├── confetti.ts               rose 🌹 confetti for clang mode
│   ├── queries.ts                RSC data fetchers
│   ├── dates.ts                  calendar window helpers
│   ├── cities.ts                 city lat/lon table
│   └── types.ts                  shared types
supabase/migrations/
├── 0001_init.sql
├── 0002_add_city_options.sql
├── 0003_complete_schema.sql
├── 0004_event_kinds_holiday_lds.sql
└── 0005_day_rating_preferred_cities.sql
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

## Deploy

Build locally (Apple Silicon = arm64, matches EC2 Graviton) and ship the artifact:

```bash
EC2_HOST=ec2-user@<ip> SSH_KEY=~/.ssh/better-planner-key.pem ./deploy/deploy.sh
```

The script builds the Next.js standalone bundle, rsyncs it to the server, and
restarts the systemd service. See `deploy/README.md` for first-time server setup,
TLS with Caddy, and swap configuration.
