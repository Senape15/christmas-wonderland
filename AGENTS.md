<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Christmas Wonderland

Interactive Advent calendar (Italian UI) built with Next.js 16 App Router, React 19, Tailwind CSS 4, and Supabase. App timezone is `Europe/Rome`.

## Commands

Run from this directory (it is the git repo root; `master` branch).

| Task | Command |
| --- | --- |
| Dev server | `npm run dev` |
| All tests | `npm test` (`vitest run`) |
| Single test file | `npx vitest run src/lib/services/advent.test.ts` |
| Lint | `npm run lint` (bare `eslint`, flat config) |
| Typecheck | `npm run typecheck` (`tsc --noEmit`) |
| Production build | `npm run build` |

There is no CI, pre-commit hook, formatter, or codegen config. `PROJECT_STATUS.md` records past verification but can be stale — re-run the commands above instead of trusting recorded counts.

## Next.js 16 quirks

- `cacheComponents` and `partialPrefetching` are enabled in `next.config.ts`. Request-time values (`Date.now()`, cookies, Supabase sessions) must be deferred with `await connection()`. `getCurrentUser()` already does this to avoid the `unstable value Date.now() while prerendering` build failure — do not remove it.
- Middleware is `src/proxy.ts` exporting `proxy` (Next 16 renamed it). Do not create `middleware.ts`.
- `cookies()` and `headers()` are async.
- Con `partialPrefetching`, ogni pagina che legge la sessione (quindi tutte le pagine `dashboard/*` e `admin/*`) blocca la navigazione. Le pagine che non hanno un guscio statico dichiarano `export const instant = false`; `instant` vale per il singolo segmento, quindi va ripetuto nelle nuove pagine, non basta il layout. Le pagine utente `dashboard` (villaggio, calendario, ricordi, ricordo-24, impostazioni) restano "instant": i dati stanno dietro `<Suspense>`.
- The bundled Next docs are the authority for APIs: `node_modules/next/dist/docs/`.

## Architecture

- Routes: `src/app/` — public home/login/register/about, protected `dashboard` (`/dashboard` villaggio, `calendario`, `ricordi`, `ricordo-24`, `impostazioni`) and `admin`, `api/auth/{callback,error,logout}`, `api/push/cron`, `api/village`.
- `src/lib/auth.ts` is the session DAL: `getCurrentUser()`, plus `requireUser()` / `requireAdmin()` server guards. The proxy only performs optimistic redirects; real enforcement is RLS + guards + Server Actions.
- Supabase clients: `src/lib/supabase/server.ts` (server, anon key + cookies), `src/lib/supabase/client.ts` and `auth-client.ts` (browser), `src/lib/supabase/admin.ts` (service role, server only).
- Business logic lives in `src/lib/services/`; Server Actions use `"use server"` and Zod, e.g. `src/lib/auth-actions.ts`.
- App shell: `/dashboard` is the Godot village (`GodotVillage.tsx` iframe); the fixed bottom dock (`src/components/layout/app-navigation.tsx`) links only Villaggio, Calendario, Ricordi, Impostazioni. Inner pages use `PageShell.tsx`. The old long dashboard, SVG village map and its art/transform helpers were removed — do not reintroduce a second home.
- Calendar: `/dashboard/calendario` (`CalendarView.tsx`) shows the 24 days and opens the `DayExperience` modal; `/dashboard?giorno=N` links are now `/dashboard/calendario?giorno=N`. `getCalendarData()` in `src/lib/services/advent.ts` combines unlocked days, openings, elf messages, and secret messages; `buildCalendarDays()` expands them to 1–24 without exposing titles of locked days. `src/lib/advent-actions.ts` records openings. Never gate `unlock_date` in client code.
- Daily experience (Phase 5): `getExperienceData(user)` in `src/lib/services/experience.ts` returns the 24-day calendar with `locked`/`available`/`opened`/`completed` states plus real progress. `loadDayExperience()` builds the opened-day payload (contents, gifts, quizzes, memory spheres, final box) and records the opening. Server Actions live in `src/lib/experience-actions.ts`; password/quiz/final-box verification lives in `src/lib/services/verification.ts`. Pure rules (state, completion, conditions, quiz, password, time) live in `src/lib/experience/*` with colocated tests. The UI is `src/components/experience/DayExperience.tsx` (accessible modal) mounted by `CalendarView`; the calendar header shows the real counters. Unlock-condition JSON is documented in `docs/DATABASE_SCHEMA.md`; reuse the existing `*_conditions` columns, never add a parallel unlock system.
- Village (Phase 3): the visible village is the Godot build in `public/village/`, loaded by `/dashboard` and fed by `GET /api/village`. Source lives in `godot/christmas-village/` (Godot 4.7, Web export, no threads); re-export with `godot --headless --path godot/christmas-village --export-release Web public/village/index.html`. `api.gd` resolves the origin at runtime (`window.location.origin`), so the old PCK patch script is gone. `getVillageData(calendar)` in `src/lib/services/village.ts` derives states from the calendar already filtered by RLS; `getVillageDialogues()` adds NPC lines from unlocked quiz questions and answers only after the quiz is completed. Place→day mapping lives **only** in `village_hotspots.day_number`; `src/lib/village/catalog.ts` is an illustrated fallback with no day numbers. Locked hotspots are stripped of `dayNumber`, `hint`, and `nicoMessage` before reaching the client. Godot scales its UI on narrow screens (`ui_scale()`), shows a loader and posts `wonderland:ready`; it opens days with `wonderland:open-day`, which the app turns into `/dashboard/calendario?giorno=N`. Never name the culprit before Dec 24.
- User-facing copy, errors, and docs are Italian; keep new strings in Italian.

## Database and security invariants

- `supabase/migrations/001_initial_schema.sql` is the schema source of truth (16 tables, RLS on every table). `002_village_map.sql` adds the village (additive/idempotent: `village_hotspots`, `village_hotspot_messages`, `physical_contents`, plus `sort_order`/`is_active` on `village_locations`); `003` fixes the admin role policy; `004_admin_panel.sql` adds the admin panel, password tables/config, final box, notifications, simulations and Storage; `005_experience_and_security.sql` tightens progress writes, adds `final_box_completions`, dedupes quiz successes and normalizes unlock dates to Rome midnight. `006_memories_and_collections.sql` (Phase 6: additive collectible metadata, `memory_entries`, `diary_events`, sphere timestamps, final-gift link) and `007_push_notifications.sql` (Phase 7: subscription metadata, `notification_preferences`, `notification_deliveries`, scheduled-notification fields) result structurally applied remotely (read-only check 2026-11-19). `008_role_security.sql` (Phase 8: prevents role self-promotion, scopes admin simulations to their owner) is **written but not applied remotely**. `src/types/database.ts` is a hand-maintained subset, not generated — update it whenever tables or columns change.
- Roles live in the app-level `public.users` table (mirror of `auth.users`), not in JWT metadata. Do not reintroduce the silent `?? "user"` fallback in `getCurrentUser()`: database/RLS errors must surface (migration 003 fixes the recursive admin policy with a `SECURITY DEFINER` `public.is_admin()` function).
- Unlock visibility is enforced by RLS (`unlock_date <= now()`) plus server-side checks in `src/lib/services/advent.ts`. Never gate future gifts in client code, and never send future gift data to the client. `village_hotspot_messages` and `physical_contents` use the same unlock join; locked hotspots expose no teaser or Nico message. Do not add place→day constants to code.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS; only use `createAdminClient()` inside server-only code (admin Server Actions and the Phase 5 services that read hashes, correct answers or future rows during admin simulation), never in client components and never in payloads returned to the client.
- Password hashes (`physical_passwords`, `final_gift_boxes`) and `quiz_answers.is_correct` are server-only. Public payloads (`PasswordChallenge`, `DayQuiz`) must never include them; only expose the correct answer text after a successful server-side verification. Writes to `password_attempts`, `password_completions`, `user_quiz_attempts` and `final_box_completions` go through the service role only; migration 005 removes the client INSERT policies. Do not reintroduce client writes.
- Env: copy `.env.local.example` to `.env.local`; only `NEXT_PUBLIC_*` values reach the browser.
- Local Supabase: `npx supabase start` (needs Docker). `supabase/config.toml` points seeding at a missing `./seed.sql`; the verification scripts are `supabase/seed/verify_schema.sql` and `supabase/seed/rls_verification.sql`. Cloud setup is done by running the migration in the Supabase SQL Editor, not `supabase db push`.

## Tests and styling

- Vitest runs in the `node` environment with `@` aliased to `src`, collecting only `src/**/*.test.ts(x)`. Service tests colocate and mock `@/lib/supabase/server`; no DOM/React testing libraries are installed.
- Tailwind 4 is wired through `@tailwindcss/turbopack` in `next.config.ts`; there is no `tailwind.config.*` or PostCSS file. Theme tokens (`pine`, `christmas-red`, `gold`, `snow`, `ice`, `wood`, `cream`, `night`) are defined in `src/app/globals.css` under `@theme`; use them instead of default palette colors.
- Keyframes must live at the top level of `globals.css`, not inside `@theme`: inside `@theme` Tailwind only emits them when it generates the matching `animate-*` utility.
- Decorative loops that render on the server (snow, twinkling lights) must stay CSS-only (`src/components/animations/Snowfall.tsx`, `FadingLights.tsx`). Framer Motion normalizes inline styles on the client, which produced hydration mismatches; use it only for interaction/`AnimatePresence` effects.
- Inline styles are re-serialized by the browser's CSSOM (max 6 significant digits, `#rrggbb` → `rgb(r, g, b)`), so hydration compares the normalized result against the props. Build them with `cssNumber`/`cssLength`/`cssRgb` from `src/lib/css-values.ts`, and seed randomness with `hashUnit` from `src/lib/deterministic.ts` (`Math.sin` differs in the last digits between Node and browsers).

## Ricordi e collezioni (Phase 6)

`loadMemorySnapshot(user)` in `src/lib/services/memories.ts` is the single
Phase 6 data source. It reuses `getExperienceData(user)` for states/progress,
reads progress timestamps with the user's RLS client, and uses the service role
only for admin config, signed photo URLs and idempotent diary/sphere writes.
Pure rules live in `src/lib/memories/*` with colocated tests; the UI is the
single hub `/dashboard/ricordi` (`MemoriesHub.tsx`, tabs Giornate/Ricordi/Sfere,
one `getMemoriesHubData()` snapshot) plus `/dashboard/ricordo-24` for the finale.
`detectPhase6Capabilities()` checks whether migration 006 is applied and the UI
degrades gracefully before it. Never enable client writes on `memory_spheres`
or `diary_events`, never expose the finale before the Phase 5 gate, and never
generate permanent public URLs for private `user_photos`.

## PWA e notifiche (Phase 7)

`public/sw.js` caches only same-origin static assets and serves navigations
network-first with an `/offline.html` fallback; never widen it to `/dashboard`,
`/admin`, `/api` or Supabase responses. `src/app/manifest.ts` is the manifest
source; icons live in `public/icons/` and are regenerated by
`scripts/generate-pwa-icons.ps1`.

Push rules are pure functions in `src/lib/push/{rules,generate,messages}.ts`;
the sender is `src/lib/push/dispatch.ts` (server-only, `web-push` + VAPID,
dedupe via `notification_deliveries.dedupe_key`, retry max 3, deactivate on
404/410). User Server Actions live in `src/lib/push/actions.ts` and always take
the identity from the session; admin sends live in
`src/lib/push/admin-actions.ts` and call `requireAdmin()`. `POST
/api/push/cron` requires `PUSH_SCHEDULER_SECRET` (Bearer or
`x-wonderland-cron-secret`) and returns 503/401/405 otherwise. Never move
delivery into the browser or expose the private VAPID key or a full push
endpoint to the client. `detectPushCapabilities()` gates UI before migration
007; preferences and subscriptions must keep working gracefully without it.
Automatic notifications only cover unlocked days and respect preferences,
quiet hours and `Europe/Rome`.

## Scope

`PROJECT_STATUS.md` defines eight phases. Phases 1–8 are complete in code;
migrations 001–007 result structurally applied remotely (read-only check,
2026-11-19). **`008_role_security.sql` is written but NOT applied** and must
be run manually in the Supabase SQL Editor after explicit authorization.
Do not start Phase 9.
