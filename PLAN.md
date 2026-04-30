# Wedding Planner — Build Plan

Collaborative date-and-venue picker for a Utah County wedding, **August–October 2026**. Six users (Adam, fiancée, both sets of parents) rate, veto, shortlist, and discuss candidate dates against weather, BYU football, and federal holidays.

---

## 1. Confirmed scope

| Decision | Choice |
|---|---|
| Auth | Supabase magic-link, open signup (anyone with the link can sign up with name + email) |
| Realtime | No — refresh-to-see |
| Window | Aug 1 – Oct 31, **2026** |
| Ratings | 1–5 stars, per user, per day |
| Veto | Per-user; surfaced group-wide as a visible "vetoed" badge (does not hard-block) |
| Shortlist | Per-user toggle, aggregated count visible |
| Day detail | Events on day + hourly historical weather for all 5 cities |
| Weather refresh | One-time pull, then static |
| Cities | Lindon, Highland, Lehi, Orem, Alpine |
| BYU football | 2026 season, home + away (away dimmed) |
| Federal holidays | Aug–Oct 2026 (Labor Day Sep 7, Columbus / Indigenous Peoples' Day Oct 12) |
| Comments | Threaded, per day |
| Stack | Next.js 15 (App Router) + TS + Tailwind + shadcn/ui |
| Backend | Supabase (Postgres + Auth) |
| Charts | Recharts |
| Hosting | Vercel |

### Assumptions to flag

1. Target year is **2026**. (Today is 2026-04-30; window starts in 3 months.)
2. Veto is *advisory* — visible to all but doesn't remove the day from view.
3. BYU 2026 kickoff times not finalized until ~12 days before each game. Seed with date + opponent + venue; time `TBD` where unknown.
4. We won't add "Saturday-only" filtering; calendar shows all days. BYU home games and all other events render as Google-Calendar-style "all-day event" bars on the day tile — no special AVOID border or red pill.

---

## 2. Architecture

```
┌──────────────────────────────────────────────┐
│  Browser (Next.js 15 App Router, RSC + CC)   │
│  - /login, /, /day/[date]                    │
│  - shadcn/ui, Tailwind, Recharts             │
└──────────────────────┬───────────────────────┘
                       │ @supabase/ssr (auth + queries)
                       ▼
┌──────────────────────────────────────────────┐
│              Supabase Project                │
│  Postgres:                                   │
│    profiles                                  │
│    events, day_ratings, comments             │
│    weather_daily, weather_hourly             │
│  Auth: magic link, open signup               │
│  RLS: read=any-authed, write=own-rows        │
└──────────────────────────────────────────────┘
                       ▲
                       │ one-time seed scripts (Node)
                       │
┌──────────────────────────────────────────────┐
│  /scripts                                     │
│  - pull-weather.ts  (Open-Meteo archive API)  │
│  - seed-byu-2026.ts (hand-coded JSON)         │
│  - seed-holidays.ts (hand-coded JSON)         │
└──────────────────────────────────────────────┘
```

---

## 3. Data model (Supabase)

```sql
-- 1. Profiles -----------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text not null,
  avatar_color text not null default '#6366f1',  -- for comment/rating chips
  created_at timestamptz default now()
);

-- Trigger: on auth.users insert, create a profile row using the
-- display_name from the user's metadata (set during signup).

-- 2. Events on the calendar ---------------------------------------------------
create type event_kind as enum (
  'byu_football_home',
  'byu_football_away',
  'federal_holiday',
  'custom'
);

create table events (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  kind event_kind not null,
  title text not null,
  description text,
  metadata jsonb default '{}'::jsonb,  -- {opponent, kickoff_local, tv_network, ...}
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
create index events_date_idx on events(date);

-- 3. Per-user day ratings -----------------------------------------------------
create table day_ratings (
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  stars smallint check (stars between 1 and 5),  -- nullable = unrated
  vetoed boolean not null default false,
  shortlisted boolean not null default false,
  updated_at timestamptz default now(),
  primary key (user_id, date)
);
create index day_ratings_date_idx on day_ratings(date);

-- 4. Threaded comments per day ------------------------------------------------
create table comments (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  user_id uuid not null references profiles(id),
  parent_id uuid references comments(id) on delete cascade,
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);
create index comments_date_idx on comments(date);

-- 5. Historical weather (10-year averages) ------------------------------------
create type city as enum ('lindon', 'highland', 'lehi', 'orem', 'alpine');

create table weather_daily (
  city city not null,
  month_day char(4) not null,   -- 'MMDD' e.g. '0815'
  mean_high_f numeric(4,1) not null,
  mean_low_f numeric(4,1) not null,
  rain_probability numeric(4,3) not null,  -- 0.000–1.000, share of years with >1mm
  primary key (city, month_day)
);

create table weather_hourly (
  city city not null,
  month_day char(4) not null,
  hour smallint not null check (hour between 0 and 23),
  mean_temp_f numeric(4,1) not null,
  mean_precip_mm numeric(5,2) not null,
  mean_wind_mph numeric(4,1) not null,
  primary key (city, month_day, hour)
);
```

### RLS

- All tables: `select` allowed for any authenticated user.
- `day_ratings`, `comments`: `insert` / `update` / `delete` only where `user_id = auth.uid()`.
- `events`: any authed user can `insert` (kind=`custom`); `update`/`delete` only own rows.
- `profiles`: `update` only own row.
- `weather_*`: read-only via app; written only by service-role seed scripts.

---

## 4. Data pipelines (one-time)

### 4.1 Weather pull — `scripts/pull-weather.ts`

- API: **Open-Meteo Historical Archive** (`https://archive-api.open-meteo.com/v1/archive`). Free, no key, hourly back to 1940.
- For each of 5 cities (lat/lon constants in `cities.ts`), pull hourly `temperature_2m`, `precipitation`, `wind_speed_10m` for **Aug 1 – Oct 31** in years **2016–2025** (10 years).
- Aggregate by `(city, month_day, hour)`: arithmetic mean across years.
- Compute `weather_daily`: daily high/low + rain_probability = (years with daily total precip > 1 mm) / 10.
- Upsert into Supabase via service role.
- Volume: 5 cities × 92 days × 24 hours × 10 years = 110,400 source data points → 11,040 hourly aggregate rows + 460 daily rows. Single-pass batch fetch, ~5 minutes runtime.

### 4.2 BYU 2026 schedule — `scripts/seed-byu-2026.ts`

- Hand-coded JSON from `byucougars.com/sports/football/schedule/2026`.
- Each game: `{ date, opponent, location, kind: 'byu_football_home' | 'byu_football_away', kickoff_local: 'TBD' | 'HH:mm', tv: 'TBD' | string }`.
- Insert into `events` with `metadata = {opponent, kickoff_local, tv}`.

### 4.3 Federal holidays — `scripts/seed-holidays.ts`

- Aug–Oct 2026:
  - 2026-09-07 — Labor Day
  - 2026-10-12 — Columbus Day / Indigenous Peoples' Day
- Insert into `events` with `kind = 'federal_holiday'`.

All three scripts: idempotent (`upsert` on natural keys), run via `bun run scripts/<name>.ts` after `.env.local` is set with `SUPABASE_SERVICE_ROLE_KEY`.

---

## 5. UI / page structure

### Routes

- `/login` — magic-link form.
- `/` — calendar view (default). Three months (Aug, Sep, Oct 2026), stacked or 3-up depending on viewport.
- `/day/[date]` — full-page day detail (also reachable as a sheet/drawer from `/`).
- `/admin` — *(skip for v1; add allowlist UI later)*

### Calendar view (`/`)

Day tile (≈ 110×110 px on desktop), styled like Google Calendar:

```
┌──────────────────────┐
│ 15            72° ⛅ │  ← date + avg high + weather glyph (top-right, muted)
│                      │
│ ▰ BYU vs Utah State  │  ← all-day event bar (filled colored bar, like GCal)
│ ▱ BYU @ Texas        │  ← away games: outlined / lighter version of the bar
│ ▰ Labor Day          │  ← holiday: another color
│                      │
│ ●●●●○ ✶3   ★3 ⛔1    │  ← group avg • your stars • shortlist count • veto count
└──────────────────────┘
```

- All-day event bars: filled bar = home game / holiday / custom; outlined bar = BYU away game (same shape, lighter / no fill). Color per `event_kind`.
- Hover → show 5-city weather summary tooltip.
- Click → open day detail sheet.

### Day detail sheet / page

Sections:

1. **Header** — date, "your rating" (5-star input), veto toggle, shortlist toggle.
2. **Group rating** — avatar chips: each user's stars / veto / shortlist state.
3. **Events** — list of events on this date (BYU + holiday + custom). "+ Add custom item" form.
4. **Weather** — small-multiples chart, one panel per city: hourly temp curve (line) + precip (bars), 0–23h x-axis. Tabs to switch unit (°F default). Daily summary line at top: "Avg high 78°F • avg low 52°F • 18% chance of rain (10-yr avg)".
5. **Discussion** — threaded comments (one level of nesting is enough for v1). Each comment: avatar, name, time, body, reply button. Plain text + line breaks; no markdown for v1.

### Components (new, in `/src/components`)

- `CalendarGrid.tsx`, `DayTile.tsx`, `DayDetailSheet.tsx`
- `StarRating.tsx`, `VetoToggle.tsx`, `ShortlistToggle.tsx`
- `EventPill.tsx`, `EventList.tsx`, `AddCustomEvent.tsx`
- `WeatherTooltip.tsx`, `WeatherHourlyChart.tsx`
- `CommentThread.tsx`, `CommentItem.tsx`, `CommentComposer.tsx`
- `UserBadge.tsx`, `Header.tsx`

---

## 6. Server actions / API surface

All via **Next.js server actions** (no separate API layer). One file per concern in `/src/actions/`:

- `auth.ts` — `signInWithMagicLink(email)`, `signOut()`.
- `ratings.ts` — `setStars(date, stars | null)`, `toggleVeto(date)`, `toggleShortlist(date)`.
- `comments.ts` — `addComment(date, body, parentId?)`, `editComment(id, body)`, `deleteComment(id)`.
- `events.ts` — `addCustomEvent(date, title, description?)`, `deleteCustomEvent(id)`.
- `queries.ts` (RSC-only data fetchers) —
  - `getMonthData(month)` → `{ days: [{ date, events, weather_daily, ratings_by_user, shortlist_count, veto_count }] }`
  - `getDayData(date)` → `{ events, weather_hourly_by_city, ratings_by_user, comments }`

All writes call `revalidatePath('/')` and `revalidatePath('/day/[date]')` so refresh-to-see is automatic on the same browser; other users still need a manual refresh, which matches your spec.

---

## 7. Project layout

```
wedding-planner/
├── PLAN.md                       (this file)
├── README.md                     (setup + run instructions)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── .env.example
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              (calendar view)
│   │   ├── login/page.tsx
│   │   └── day/[date]/page.tsx
│   ├── components/               (see §5)
│   ├── actions/                  (see §6)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── cities.ts             (lat/lon constants)
│   │   ├── dates.ts              (Aug-Oct 2026 helpers)
│   │   └── types.ts
│   └── styles/globals.css
├── supabase/
│   └── migrations/
│       └── 0001_init.sql         (everything in §3)
└── scripts/
    ├── pull-weather.ts
    ├── seed-byu-2026.ts
    └── seed-holidays.ts
```

---

## 8. Milestones

| # | Deliverable | Est. |
|---|---|---|
| M1 | Scaffold Next.js + Tailwind + shadcn; Supabase project + magic-link auth (open signup with name + email); `/login` works | 0.5 d |
| M2 | Migration `0001_init.sql` applied; RLS policies; `profiles` trigger | 0.5 d |
| M3 | Run `pull-weather.ts` and `seed-byu-2026.ts` and `seed-holidays.ts`; verify rows in Supabase | 0.5 d |
| M4 | Calendar view: 3 months, day tiles with weather + event pills (read-only) | 1 d |
| M5 | Day detail sheet: events list + 5-city hourly weather chart | 1 d |
| M6 | Ratings (stars + veto + shortlist) wired end-to-end with server actions | 0.5 d |
| M7 | Threaded comments | 0.5 d |
| M8 | "Add custom event" + Google-Calendar-style all-day event bars + group-summary chips on tiles | 0.5 d |
| M9 | Mobile pass + visual polish + Vercel deploy | 0.5 d |

**Total: ~5–6 focused days.**

---

## 9. Open questions / things to decide later

- Do we want an **iCal / .ics export** for the picked date once we lock it? (Probably yes, but not v1.)
- Do we want a **"final pick" lock** — once everyone agrees, freeze the day visually? Could be a M10.
- Lock signup later (allowlist or invite-only) once the right people have accounts.
- Display **BYU away game lodging impact** (Provo hotels still fill on home weekends, not away). Not v1; mention in tile if needed.
- Daylight + sunset overlay on hourly chart? Useful for ceremony timing. Could be M10.

---

## 10. Risks

- **Open-Meteo rate limits**: free tier is 10k calls/day; our 5-city × 10-year × 3-month pull is ~150 calls if we batch by month. Safe.
- **BYU schedule TBD times**: cosmetic only — display "TBD" until ~2 weeks before each game.
- **Supabase free tier**: well within 500 MB storage / 2 GB bandwidth for this volume.
- **Magic-link delivery**: Supabase ships its own SMTP; for production, swap in Resend or Postmark to avoid spam folder. Cosmetic for v1.

---

*Next step: confirm assumptions in §1 and §2, then I scaffold the repo and run M1.*
