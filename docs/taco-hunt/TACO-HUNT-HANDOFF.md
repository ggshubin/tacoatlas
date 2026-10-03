# Handoff: Taco Hunt list and map on tacoatlas.app

For: Claude Code, working in the tacoatlas.app repo.
From: a Claude (Cowork) session with George, 2026-10-03.
Owner: George (@ggshubin on TikTok). Approves every step below that writes to production.

Files that come with this brief (put them in the repo at `docs/taco-hunt/`):

| File | What it is |
|---|---|
| `TACO-HUNT-HANDOFF.md` | This brief. |
| `taco-hunt-spots.json` | All 108 spots as of 2026-10-03. Source of truth for the seed. |
| `taco-hunt-reference.html` | The current working page (a claude.ai artifact). Use it as a behavior and layout reference, not as code to paste. It depends on the claude.ai artifact runtime (`window.claude.use("db")`) and will not run on its own. |

---

## 1. Goal

Rebuild George's private "Taco Hunt List" as part of tacoatlas.app:

1. A **map plus list** of food truck and taco spot suggestions his TikTok followers sent him.
2. George can **mark spots visited, plan a visit date and add notes**.
3. A **public view** that shows only spots George has approved for the public.
4. Data lives in **the existing TacoAtlas Supabase project**, so a weekly automated sweep can keep adding new suggestions.

## 2. What exists today (verified 2026-10-03)

- **Current page:** claude.ai artifact `https://claude.ai/artifact/4SwsRGjHCEAzjEMsNGkJiq`, private to George. Its data is in the artifact's own database (collection `trucks`, plus doc `meta/sweep`). Your code cannot reach that database. Use `taco-hunt-spots.json` instead.
- **Vercel:** a project named `tacoatlas` exists (team `team_utaVfDc3h9GURhi56JW4OlgI`). I could not read which Git repo it deploys from: Vercel returned 403 for that team scope. Confirm from the repo itself (`.vercel/project.json` or the Vercel dashboard).
- **Supabase:** project `TacoAtlas`, ref `szblruvrajswbpksinkv`, region us-west-2, status active. **I did not inspect its tables.** Read the schema before writing a migration. The app already has auth, friends and RLS policies (per George's notes: React Native + Expo app, Supabase backend, RLS-secured friend system).
- **Website stack: unknown to me.** George's business site is Next.js on Vercel. Do not assume tacoatlas.app is the same. Check `package.json` first and follow the repo's conventions, styling system and any CLAUDE.md.
- **Weekly sweep:** a Cowork scheduled task, "TikTok taco sweep" (`trig_01E5sMDe3744b2p9FigS3fsT`), runs Mondays at 7:57am Pacific on George's Mac. It reads his TikTok DMs and comments through the Claude desktop app's browser and writes new spots into the artifact database. It must be repointed to Supabase after this migration (section 8). You probably can't edit it from Claude Code. George does that in Cowork.

## 3. The data

`taco-hunt-spots.json` → `spots[]`, 108 rows:

- **Status:** 79 to visit, 13 visited, 16 need info.
- **Kind:** 46 truck, 41 restaurant, 15 pop-up, 4 stand, 2 other.
- **Location:** 74 have coordinates.
  - **address** (27): matched to a full street address with the US Census geocoder.
  - **cross-streets** (24): placed at a Portland-grid address built from cross streets, e.g. "190th & Stark" became 19000 SE Stark St. Close, but not the exact lot.
  - **name-search** (21): found by business name on OpenStreetMap Nominatim. Least reliable.
  - **nearby** (2): copied from a neighbor in the same lot.

Fields per row:

| Field | Type | Notes |
|---|---|---|
| `id` | text | Slug of the name. Stable key, use it for upserts. |
| `name` | text | |
| `where` | text | Free-text location ("190th & Stark", "Inside Paisanos Plaza"). |
| `addr` | text or null | Full street address when known. |
| `area` | text | One of: Rockwood / Gresham, East Portland, SE Portland, Clackamas / Happy Valley, Milwaukie / Gladstone, NE / N Portland, Downtown, Westside, Vancouver / Camas WA, Outer (Damascus / Boring / Estacada), or "". |
| `kind` | text | truck, restaurant, pop-up, stand, other. |
| `food` | text | What to order. |
| `hours` | text | Free text. |
| `by` | text[] | TikTok handles of who suggested it, e.g. "@someone (DM)". **Private.** |
| `mentions` | int | Equals `by.length`. Drives ranking. |
| `first` | date | First time it was suggested. |
| `status` | text | todo, visited, needs-info. "Planned" is not stored: it is derived as `plannedFor` set and status not visited. |
| `visitedOn` | date or null | |
| `plannedFor` | date or null | |
| `notes` | text | Claude's notes from the DMs. **Private.** Some name private people or mention a phone number given in a DM. |
| `myNote` | text | George's own note. **Private.** |
| `lat`, `lng` | float | Present on 74 rows. |
| `geoPrecision` | text | address, cross-streets, name-search, nearby. |
| `geoMatch` | text | What the geocoder matched. Useful for debugging pins. |

Known bad or weak pins. Fix by hand or leave them flagged:

- `tito-s-taquitos`: points to their Multnomah Village shop. The commenter meant Swan Island.
- `susana-s-pop-up-stand`: somewhere on NW Lakeshore Ave, Vancouver, not the exact corner of NW 78th St.
- `alvaro-s-tacos`: deliberately left without coordinates. Name search found a Tigard location, but the commenter said Allen & Hall in Beaverton.
- `memo-el-taco`: "10000 SE Elon St, Clackamas" geocoded, but the street name came from a DM as typed. Worth a sanity check.
- Possible duplicates, flagged in `notes`: Birrieria Los 3 Hermanos and Los 7 Hermanos; Rigoberto's Taco Shop and Rigoberto's Tacos (truck?); El Cazador #2/#3 and the "192nd & Stark" cart.

## 4. Decisions George must make before you build

Ask George each of these at the start, with the default shown. Don't pick silently.

1. **What is public.** Default: nothing is public until George approves it, per spot.
   - Why: George's "map your favorite taco spots" TikTok drew dozens of comments asking him **not** to publish where unpermitted pop-ups set up, because of immigration enforcement. A public map of pop-up locations could put vendors at risk.
   - Suggested first batch to offer him: rows where `kind` is `restaurant`, or `truck` with a real `addr`. That is about 87 candidates before his review.
   - Never public, whatever he approves: `by`, `notes`, `myNote`, `mentions`, visit and plan dates. Pop-ups and stands stay private by default.
2. **Route names.** Default: public `/spots`, private `/admin/spots` (or match the repo's existing admin pattern).
3. **Who is admin.** Default: George's existing TacoAtlas Supabase account only. Check how the app marks admins. If it doesn't, add a minimal owner check rather than a roles system.
4. **Map provider.** Default: MapLibre GL JS with MapTiler vector tiles (free tier, key in an env var). Alternatives: Mapbox, or Leaflet with Stadia or MapTiler raster tiles. George must create the account and supply the key. **Do not** bulk-download or proxy openstreetmap.org tiles. OSM's tile policy forbids it, and CARTO now requires a key.
5. **Is the claude.ai artifact retired** after migration, or kept as a read-only backup? Default: keep it for one month, then retire.

## 5. Supabase design (proposal: inspect the schema first, then adapt)

One table, private by default, plus a public view with only safe columns.

```sql
create table public.food_spots (
  id            text primary key,              -- slug from the JSON
  name          text not null,
  where_text    text,
  addr          text,
  area          text,
  kind          text check (kind in ('truck','restaurant','pop-up','stand','other')),
  food          text,
  hours         text,
  suggested_by  text[] default '{}',           -- private
  mentions      int  default 0,                -- private (ranking only)
  first_seen    date,
  status        text not null default 'todo' check (status in ('todo','visited','needs-info')),
  visited_on    date,
  planned_for   date,
  notes         text,                          -- private
  my_note       text,                          -- private
  lat           double precision,
  lng           double precision,
  geo_precision text check (geo_precision in ('address','cross-streets','name-search','nearby')),
  geo_match     text,
  is_public     boolean not null default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.food_spots enable row level security;
-- Owner-only policies for select/insert/update/delete. Use the repo's existing
-- admin/owner pattern. If none exists, compare auth.uid() to George's user id
-- (store it in a small config table or a Postgres setting, not hardcoded in SQL).

create view public.food_spots_public with (security_invoker = false) as
  select id, name, where_text, addr, area, kind, food, hours, lat, lng, geo_precision
  from public.food_spots
  where is_public = true and kind not in ('pop-up','stand');
grant select on public.food_spots_public to anon, authenticated;
```

Notes:

- The view runs with the owner's rights, so anon can read the safe columns of public rows without any policy on the base table. Supabase's security advisor flags owner-rights views, so expect a warning. If George prefers no warning, use the alternative: an anon `select` policy on `is_public = true and kind not in ('pop-up','stand')`, plus column-level grants that only expose the safe columns to anon. Either way, test with the anon key that private columns are unreadable.
- Keep an `updated_at` trigger if the repo already uses one.
- **Seed:** write a script (`scripts/seed-food-spots.ts` or SQL) that reads `taco-hunt-spots.json` and upserts on `id`. Map `where`→`where_text`, `by`→`suggested_by`, `first`→`first_seen`, `visitedOn`→`visited_on`, `plannedFor`→`planned_for`, `myNote`→`my_note`, `geoPrecision`→`geo_precision`, `geoMatch`→`geo_match`. Use the service role key **locally only**, never in client code. Run it on a Supabase branch or local stack first, then on production with George's OK.
- If the TacoAtlas app already has a places table, **do not merge** into it without George. App places belong to app users. These are George's research leads.

## 6. The page: behavior to carry over

Match the reference page's behavior. Restyle to tacoatlas.app's design system.

**Admin view (`/admin/spots`):**

- **Summary counts:** To visit, Planned, Visited, Need location.
- **Filters:** status chips (To visit [default], Planned, Visited, Need info, All), area dropdown, and a search box that searches name, street, food, handles and notes.
- **Map at the top, list below.**
- **Pins:**
  - **To visit:** chile-red circle with the mention count inside. Size grows slightly with mentions, capped.
  - **Planned:** amber.
  - **Visited:** green with a check mark.
  - **Approximate** (geo_precision is not `address`): dashed outline.
  - Pins in the same lot are offset slightly so none hide.
- **The "To visit" filter shows visited pins on the map too**, so George sees both at once. The list still shows only to-visit.
- **Pin popup:** name, status, mention count, address, what to order, hours, "pin is approximate" note when relevant, a Directions link (Google Maps search URL from `addr`, else name + where), and a Mark visited / Move back button.
- A line under the map: "N spots aren't on the map because they have no usable location yet", with a link that switches the filter to Need info.
- **List:**
  - **Expanded at top:** any planned spots (soonest first), then the 8 most-mentioned unvisited spots.
  - **Everything else:** collapsed one-line rows, grouped by area, sorted by mentions. Each row shows name, where, status pill and mention count, and taps open to the full card.
  - When searching, show every match expanded.
  - Known issue: the 8-spot cutoff splits a tie at 3 mentions. Ask George whether he'd rather have "all with 3+ mentions".
- **Full card:** name, address + Directions, mentions, status/kind/hours tags, order, notes, my note, "Suggested by … · first <date>", and actions: Mark visited today / Move back to list, Plan for <date>, Clear date, Add/Edit note.
- **Calendar tab:** month grid showing planned (amber) and visited (green) spots by date, with previous/next/today controls.
- Light and dark themes. Works at 390px phone width.

**Public view (`/spots`):** the map plus a simple list from `food_spots_public` only. No mentions, handles, notes, statuses or dates. No visited or planned state. Directions link per spot. An "approximate location" note where `geo_precision` is not `address`.

## 7. Build order

1. Read the repo: framework, routing, styling, Supabase client setup, auth, CLAUDE.md. Report back to George before changing anything.
2. Ask George the section 4 questions.
3. Write the migration and seed script. Run them on a Supabase branch or local stack. Run the security advisor.
4. Build `/admin/spots` against the branch data.
5. Build `/spots` against `food_spots_public`.
6. Add the map key as an env var in Vercel (preview + production). Never commit it.
7. Open a PR, deploy a Vercel preview, and have George check it on his phone.
8. With George's OK: apply the migration to production, run the seed, merge.

## 8. After launch: repoint the weekly sweep (George does this in Cowork)

The Cowork task "TikTok taco sweep" (`trig_01E5sMDe3744b2p9FigS3fsT`) currently writes to the artifact database with `ArtifactData`. After migration, George should ask Cowork to update its prompt so that:

- It reads existing rows and writes new ones to `public.food_spots` through the Supabase connector (`execute_sql` on project `szblruvrajswbpksinkv`), upserting on `id`.
- New rows are always `is_public = false`. The sweep must never make anything public.
- It keeps its existing rules: never overwrite `status`, `visited_on`, `planned_for` or `my_note`; append handles to `suggested_by` and bump `mentions` for repeat suggestions; geocode new spots (Census for addresses, Portland-grid address for cross streets, Nominatim for name-only, reject results outside lat 45.25–45.75 / lng −123.2 to −122.2, never guess).
- It stores its "last sweep" time in a one-row table, e.g. `food_spots_meta`. The current value is `2026-10-02T20:45:00Z`.

Ask George whether he'd rather the sweep keep writing to the artifact as well, as a backup, during the transition.

## 9. Done means

- [ ] Migration applied. The base table has RLS on. Anon cannot read `suggested_by`, `notes`, `my_note`, `mentions` or dates (test with the anon key).
- [ ] 108 rows seeded. 74 with coordinates. Status counts 79 / 13 / 16 match the JSON.
- [ ] `/admin/spots` works for George and is refused for anyone else.
- [ ] `/spots` shows only approved rows and no pop-ups or stands.
- [ ] Mark visited, plan, clear and note all save and survive a reload.
- [ ] Map key is in env vars, not in git.
- [ ] Checked on a phone in light and dark.
- [ ] George knows to repoint the weekly sweep (section 8).
