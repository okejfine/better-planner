/**
 * Seed the BYU 2026 football schedule, federal holidays, other observances
 * (Halloween), and LDS General Conference into public.events for the
 * Jul–Dec 2026 planning window.
 *
 * Idempotent: deletes all prior seeded rows (created_by is null), then
 * re-inserts. User-created custom events (created_by set) are never touched.
 *
 * NOTE: the 'holiday' and 'lds_conference' event kinds require migration
 * 0004_event_kinds_holiday_lds.sql to be applied first. Those rows are
 * inserted in a separate batch so the rest still seeds if 0004 hasn't run.
 *
 * Usage:
 *   bun run scripts/seed-events.ts              # apply via service role
 *   bun run scripts/seed-events.ts --sql-only   # write /tmp/seed-events.sql only
 */

import { createClient } from "@supabase/supabase-js";

type SeedKind =
  | "byu_football_home"
  | "byu_football_away"
  | "federal_holiday"
  | "holiday"
  | "lds_conference";

type SeedEvent = {
  date: string;
  kind: SeedKind;
  title: string;
  metadata: Record<string, string>;
};

const BYU_2026: SeedEvent[] = [
  {
    date: "2026-09-05",
    kind: "byu_football_home",
    title: "BYU vs Utah Tech",
    metadata: { opponent: "Utah Tech", kickoff_local: "18:00", tv: "ESPN+" },
  },
  {
    date: "2026-09-12",
    kind: "byu_football_home",
    title: "BYU vs Arizona",
    metadata: { opponent: "Arizona", kickoff_local: "13:30", tv: "FOX" },
  },
  {
    date: "2026-09-19",
    kind: "byu_football_away",
    title: "BYU @ Colorado State",
    metadata: { opponent: "Colorado State", kickoff_local: "17:30", tv: "CBS" },
  },
  {
    date: "2026-10-03",
    kind: "byu_football_away",
    title: "BYU @ TCU",
    metadata: { opponent: "TCU", kickoff_local: "TBD", tv: "TBD" },
  },
  {
    date: "2026-10-09",
    kind: "byu_football_home",
    title: "BYU vs Iowa State",
    metadata: { opponent: "Iowa State", kickoff_local: "20:15", tv: "ESPN" },
  },
  {
    date: "2026-10-17",
    kind: "byu_football_home",
    title: "BYU vs Notre Dame",
    metadata: { opponent: "Notre Dame", kickoff_local: "TBD", tv: "TBD" },
  },
  {
    date: "2026-10-24",
    kind: "byu_football_away",
    title: "BYU @ UCF",
    metadata: { opponent: "UCF", kickoff_local: "TBD", tv: "TBD" },
  },
  {
    date: "2026-10-31",
    kind: "byu_football_home",
    title: "BYU vs Arizona State",
    metadata: { opponent: "Arizona State", kickoff_local: "TBD", tv: "TBD" },
  },
  {
    date: "2026-11-07",
    kind: "byu_football_away",
    title: "BYU @ Utah",
    metadata: {
      opponent: "Utah",
      location: "Salt Lake City, UT",
      kickoff_local: "TBD",
      tv: "TBD",
    },
  },
  {
    date: "2026-11-14",
    kind: "byu_football_home",
    title: "BYU vs Baylor",
    metadata: { opponent: "Baylor", kickoff_local: "TBD", tv: "TBD" },
  },
  {
    date: "2026-11-21",
    kind: "byu_football_away",
    title: "BYU @ Kansas",
    metadata: {
      opponent: "Kansas",
      location: "Lawrence, KS",
      kickoff_local: "TBD",
      tv: "TBD",
    },
  },
  {
    date: "2026-11-28",
    kind: "byu_football_home",
    title: "BYU vs Cincinnati",
    metadata: { opponent: "Cincinnati", kickoff_local: "TBD", tv: "TBD" },
  },
  {
    date: "2026-12-04",
    kind: "byu_football_away",
    title: "Big 12 Championship (if BYU qualifies)",
    metadata: {
      opponent: "TBD",
      location: "Arlington, TX (neutral)",
      kickoff_local: "TBD",
      tv: "ABC",
      conditional: "BYU must qualify",
    },
  },
];

const FEDERAL_HOLIDAYS: SeedEvent[] = [
  {
    date: "2026-06-19",
    kind: "federal_holiday",
    title: "Juneteenth",
    metadata: { alt_name: "Juneteenth National Independence Day" },
  },
  {
    date: "2026-09-07",
    kind: "federal_holiday",
    title: "Labor Day",
    metadata: {},
  },
  {
    date: "2026-10-12",
    kind: "federal_holiday",
    title: "Columbus Day",
    metadata: { alt_name: "Indigenous Peoples' Day" },
  },
  {
    date: "2026-11-11",
    kind: "federal_holiday",
    title: "Veterans Day",
    metadata: {},
  },
  {
    date: "2026-11-26",
    kind: "federal_holiday",
    title: "Thanksgiving Day",
    metadata: {},
  },
  {
    date: "2026-12-25",
    kind: "federal_holiday",
    title: "Christmas Day",
    metadata: {},
  },
];

// Non-federal observances. Require the 'holiday' enum value (migration 0004).
const OBSERVANCES: SeedEvent[] = [
  {
    date: "2026-10-31",
    kind: "holiday",
    title: "Halloween",
    metadata: {},
  },
];

// LDS General Conference (semiannual; April + October). Only the October 2026
// sessions fall inside the Jul–Dec planning window. Requires the
// 'lds_conference' enum value (migration 0004).
const LDS_CONFERENCE: SeedEvent[] = [
  {
    date: "2026-10-03",
    kind: "lds_conference",
    title: "LDS General Conference (Sat)",
    metadata: {
      sessions: "10:00, 14:00, 18:00 MDT",
      location: "Salt Lake City, UT",
    },
  },
  {
    date: "2026-10-04",
    kind: "lds_conference",
    title: "LDS General Conference (Sun)",
    metadata: {
      sessions: "10:00, 14:00 MDT",
      location: "Salt Lake City, UT",
    },
  },
];

// Kinds that exist on a base schema (pre-0004). Always safe to insert.
const BASE_EVENTS = [...BYU_2026, ...FEDERAL_HOLIDAYS];
// Kinds that need migration 0004's enum values.
const NEW_KIND_EVENTS = [...OBSERVANCES, ...LDS_CONFERENCE];
const SEED_EVENTS = [...BASE_EVENTS, ...NEW_KIND_EVENTS];

function sqlLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function buildSql(events: SeedEvent[]) {
  const values = events
    .map(
      (e) =>
        `(${sqlLiteral(e.date)}, ${sqlLiteral(e.kind)}::public.event_kind, ${sqlLiteral(e.title)}, ${sqlLiteral(JSON.stringify(e.metadata))}::jsonb)`,
    )
    .join(",\n");

  return `-- Better Planner — seeded calendar events (BYU 2026 + holidays + LDS conf)
-- Requires migration 0004_event_kinds_holiday_lds.sql for the 'holiday' and
-- 'lds_conference' kinds. Safe to re-run; only removes prior seeded rows.

delete from public.events where created_by is null;

insert into public.events (date, kind, title, metadata) values
${values};
`;
}

async function apply() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Remove all prior seeded rows (seeded rows have no creator). User-created
  // custom events keep created_by set and are left untouched.
  const { error: deleteError } = await supabase
    .from("events")
    .delete()
    .is("created_by", null);
  if (deleteError) throw deleteError;

  const toRows = (events: SeedEvent[]) =>
    events.map((e) => ({
      date: e.date,
      kind: e.kind,
      title: e.title,
      metadata: e.metadata,
    }));

  const { error: baseError } = await supabase
    .from("events")
    .insert(toRows(BASE_EVENTS));
  if (baseError) throw baseError;

  const { error: newKindError } = await supabase
    .from("events")
    .insert(toRows(NEW_KIND_EVENTS));
  if (newKindError) {
    console.warn(
      `\n⚠️  Could not insert ${NEW_KIND_EVENTS.length} new-kind events ` +
        `(Halloween + LDS conference).\n` +
        `   Run supabase/migrations/0004_event_kinds_holiday_lds.sql in the ` +
        `Supabase SQL Editor,\n   then re-run this script.\n   Cause: ${newKindError.message}\n`,
    );
    return { applied: BASE_EVENTS.length, skipped: NEW_KIND_EVENTS.length };
  }
  return { applied: SEED_EVENTS.length, skipped: 0 };
}

const sqlOnly = process.argv.includes("--sql-only");

if (sqlOnly) {
  await Bun.write("/tmp/seed-events.sql", buildSql(SEED_EVENTS));
  console.log(
    `Wrote /tmp/seed-events.sql (${SEED_EVENTS.length} events: ${BYU_2026.length} BYU, ${FEDERAL_HOLIDAYS.length} federal holidays, ${OBSERVANCES.length} observances, ${LDS_CONFERENCE.length} LDS conference)`,
  );
} else {
  const { applied, skipped } = await apply();
  await Bun.write("/tmp/seed-events.sql", buildSql(SEED_EVENTS));
  console.log(
    `Seeded ${applied} events${skipped ? ` (${skipped} skipped — needs migration 0004)` : ""}: ` +
      `${BYU_2026.length} BYU, ${FEDERAL_HOLIDAYS.length} federal holidays, ${OBSERVANCES.length} observances, ${LDS_CONFERENCE.length} LDS conference`,
  );
  console.log("SQL snapshot: /tmp/seed-events.sql");
}
