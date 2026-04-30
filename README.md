# Wedding Planner

Collaborative date picker for an Aug–Oct 2026 wedding in Utah County.

- **Stack:** Next.js 16 (App Router) + TypeScript + Tailwind v4 + @supabase/ssr + Recharts
- **Backend:** Supabase Postgres + Auth (magic-link, open signup)
- **Data:** 10-yr historical weather for Lindon, Highland, Lehi, Orem, Alpine (Open-Meteo); BYU 2026 football; federal holidays

See `PLAN.md` for the full design.

## Run locally

```bash
bun install
bun run dev
# http://localhost:3000
```

`.env.local` contains the Supabase URL + publishable key. Sign in with name + email; you'll receive a magic link.

## Project layout

```
src/
├── app/
│   ├── page.tsx            calendar (Aug–Oct 2026)
│   ├── login/page.tsx
│   ├── day/[date]/page.tsx
│   └── auth/{callback,signout}/route.ts
├── components/             Calendar, DayTile, WeatherChart, CommentThread, Toggles, …
├── actions/                ratings, comments, events server actions
├── lib/
│   ├── supabase/           client/server/proxy
│   ├── queries.ts          RSC data fetchers
│   ├── dates.ts            window helpers (2026-08 → 2026-10)
│   └── cities.ts           5-city lat/lon table
├── proxy.ts                Next 16 middleware → auth gate
supabase/migrations/0001_init.sql
scripts/
├── pull-weather.ts         Open-Meteo archive pull (one-time)
└── build-weather-sql.ts    JSON → SQL chunk emitter
```

## Re-pulling weather

```bash
bun run scripts/pull-weather.ts        # writes /tmp/wedding-weather.json
# Then bulk-POST via PostgREST or apply via Supabase MCP.
```
