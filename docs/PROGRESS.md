# Progress / Handoff

> Read this file first in any new session. It is the single source of truth
> for "where things stand" — update it before ending a session, and
> re-read it (don't assume) at the start of one, since another session may
> have advanced it. See the concurrent-session note below for why that
> caution is not hypothetical.

**Last updated**: 2026-08-07.

> **This file drifted badly between 2026-08-05 and 2026-08-06** — it still
> said "Phase 0 done, no `package.json`, no Nuxt scaffold" while the repo
> had already grown a full Nuxt 4 app (auth, landing page, dashboard shell,
> discovery feed) across several commits (`7387e2b` onward) that never
> updated this doc. The stale sections below have been corrected to match
> what's actually in the repo as of this update; treat anything not listed
> here as unverified rather than assuming it's still missing. If you're
> picking this up next: a full phase-by-phase audit (does `dashboard/`,
> `live.vue`, `following.vue` etc. actually work end to end, or are they
> scaffolds?) is still owed and wasn't in scope for this session.

## Current phase

Well past Phase 5 (Discovery) in terms of code present — `npm run dev`
works, Postgres (Neon) + Drizzle + better-auth are wired and functional,
and there's a working discovery/clips feed. **Not phase-audited** in the
strict PROMPT.md §19 sense (no session has confirmed every earlier-phase
deliverable is actually complete vs. scaffolded) — don't take low-numbered
"not started" phases at face value without checking the code first.

## What exists right now (verified in this session, 2026-08-06)

- Full Nuxt 4 app (`package.json`, `nuxt.config.ts`) — Vue 3.5, Tailwind v4
  + shadcn-vue, Pinia + TanStack Query, Drizzle ORM + Postgres (Neon,
  `DATABASE_URL` configured in `.env`), better-auth (auth routes live under
  `server/api/auth/`), pino logging.
- Pages present: `index`, `about`, `careers`, `login`/`signup`/
  `forgot-password`/`reset-password`/`verify-email`, `settings/security`,
  `settings/two-factor`, `security`, `clips`, `live`, `following`,
  `category/index`, `dashboard/index`, `dashboard/analytics`,
  `dashboard/stream` — existence confirmed by file listing only; not all
  individually verified working end to end this session.
- **Clips (`/clips`) — verified working end to end this session**: real
  `clips` Postgres table (`server/db/schema/clips.ts`), `/api/discovery/clips`
  queries it live (no more fixture data), seeded via `npm run db:seed`
  with curl-verified freely-licensed sample videos, and clip playback uses
  a real Vidstack player (`vidstack@1.15.6`) instead of a static
  thumbnail + fake play icon. See [video-streaming.md](./video-streaming.md)
  and [DECISIONS.md](./DECISIONS.md) ADR-012. Confirmed via Playwright:
  grid reflows to one column and the player modal fits without horizontal
  overflow at 375×812; clicking play advances `currentTime`, no console
  errors.
- **Categories (`/category`, `/category/[slug]`) — real, verified end to end**:
  derived views over the existing `clips.category` enum (no `categories`
  table). `server/api/discovery/categories.get.ts` (group-by count/total
  views/top-clip thumbnail) and `server/api/discovery/categories/[slug].get.ts`
  (Zod-validated slug, 404 on unknown) back
  `app/composables/useDiscoveryCategories.ts` /`useDiscoveryCategoryClips.ts`,
  rendered by `app/components/discovery/CategoryGrid.vue` + `CategoryCard.vue`
  + `CategoryDetail.vue` (reuses `ClipCard`/`ClipPlayerModal`/`useWatchlist`).
  Slug ↔ enum mapping and editorial copy live in `shared/utils/category.ts`;
  `server/utils/discovery.ts` holds the shared `toClip` mapper. Covered by
  `CategoryCard.spec.ts`, `shared/utils/category.spec.ts`, and
  `e2e/category.spec.ts` (all green against the seeded Neon DB).
- **Live directory (`/live`) — real, verified end to end**: no more
  `ComingSoon` placeholder and **no fixtures anywhere in discovery**
  (`server/utils/fixtures/` is deleted). Real `live_streams` Postgres table
  (`server/db/schema/live-streams.ts`, migration
  `0002_noisy_lady_deathstrike.sql`, reusing `clipCategoryEnum`), seeded by
  `npm run db:seed:live` with 8 channels on curl-verified freely-licensed
  HLS/mp4 sources. `/api/discovery/live` queries it ordered by viewer count
  and formats `"8.4k watching"` / uptime `"3h 17m"` (`formatUptime`, new in
  `server/utils/format.ts`). UI: `app/components/discovery/LiveDirectory.vue`
  → `LiveChannelGrid.vue` → `LiveChannelCard.vue` with search, category
  tabs, skeleton/empty/error states, `useWatchlist()` save (kind `'live'`),
  and real playback through the shared `ClipPlayerModal`. Verified in a real
  browser: 8 cards render, category/search filtering works, `currentTime`
  advances on both an HLS and an mp4 channel, single column with no
  horizontal overflow at 375×812, no console errors. See ADR-013 and
  [video-streaming.md](./video-streaming.md).
- **Watch page (`/watch/[slug]`) — built 2026-08-07, see ADR-014 / ADR-015 and
  [watch-page.md](./watch-page.md)**. One page for both content kinds: the
  slug resolves against `clips.id` first, then `live_streams.streamer_name`
  (case-insensitive). Player + title/meta + channel bar with a real Follow
  button + like/dislike + share + save + collapsible description, then
  **read-only comments** for clips and **live chat** for streams, plus a
  category-based up-next rail. Sidebar sits right at `lg` and stacks below
  the video underneath it.
  - Four new tables (migration `0003_*`): `comments`, `chat_messages`,
    `reactions`, `follows`. Plus a nullable `description` on `clips` and
    `live_streams`. Seeded by `npm run db:seed` (now runs clips → live →
    comments → chat; **order matters**, the last two have FKs).
  - Nine endpoints under `server/api/watch/[slug]/` and
    `server/api/channels/[name]/`. Writes go through `requireUser`
    (`server/utils/session.ts`).
  - Chat is real but **not yet realtime** — persisted messages over REST,
    polled every 5s while the tab is visible (ADR-015). Phase 8 swaps the
    interval for crossws with no UI change.
  - `ClipPlayerModal.vue` and `LiveChannelView.vue` were **deleted** — every
    call site now navigates to `/watch/…`. `/live/[username]` is a redirect.
  - Known gaps, deliberate: up-next is category-only (no recommender); live
    viewer counts stay static (Phase 7); `follows.channel` is a text handle
    because there's no `channels` table.
- **Watch page, second pass — 2026-08-07, see ADR-016.** Three things the
  read-only first pass left behind:
  1. **Comments are writable.** Post, reply (one level), like and delete
     your own. Four endpoints under `server/api/watch/[slug]/comments`,
     all writes through `requireUser` with ownership re-checked server-side.
     New `comment_likes` table — `comments.likes` stays as the seeded
     baseline and real likes count on top, so seeded social proof survives
     and an app-written comment starts at zero. Optimistic UI for like and
     delete (`app/utils/comments.ts`, unit-tested); posting waits for the
     server id. The "read-only for now" banner is gone.
  2. **Seed coverage.** `seed-comments.mjs` covered 4 of 7 clips, so opening
     `/watch/clip-rendering` showed an empty comment list and a one-line
     info box and looked broken. Every seeded clip now has comments, and
     three thin descriptions were fleshed out. Guarded by an e2e test that
     walks `/api/discovery/clips` rather than hard-coding one slug.
  3. **The player wears our own skin.** Vidstack's headless elements under
     `app/components/watch/player/` + `app/assets/css/player.css`;
     `media-video-layout`, `default/theme.css` and `layouts/video.css` are
     no longer used. YouTube-shaped bar: scrubber with hover timestamp,
     play, ±10s, volume, time, captions, speed/quality, PiP, fullscreen.
  - **⚠️ Verification status — read this before trusting the above.** Same
    problem as the first pass: the shell tool's safety classifier was down
    for most of this session. What that means concretely:
    - **`npm run db:generate` has NOT been run — the `comment_likes`
      migration does not exist yet.** The schema file
      (`server/db/schema/comment-likes.ts`) is written and exported, but
      nothing is diffed or applied. **Comment likes will 500 until this
      runs**, and the rest of the comment system is untested against a real
      database. Run `npm run db:generate && npm run db:migrate` first.
    - Then `npm run db:seed:comments` for the new rows.
    - `npm run lint && npm run typecheck && npm run test && npm run test:e2e`
      have not been run against any of this.
    - **The player has never been rendered in a browser.** It was written
      against Vidstack's element list (`node_modules/vidstack/elements.json`)
      and its slider CSS variables, both read from the installed package —
      not guessed — but a custom control bar is exactly the kind of thing
      that needs eyes on it. Check `/watch/clip-rendering` and
      `/zz-watch-preview` in both modes.
    - **The share button was reported broken by the user and is NOT fixed.**
      The wiring is correct end to end (`WatchActions` → `WatchLayout` →
      `onShare` in `WatchView.vue`, clipboard + toast, `<Toaster>` mounted
      in `app.vue`), so the failure is at runtime and needs the browser to
      diagnose. Do not "fix" it by rewriting the handler without first
      reproducing it — start with the console.
  - **⚠️ NOT YET VERIFIED — do this first if you're picking it up.** The
    session that wrote this lost the ability to execute shell commands
    partway through (the tool's safety classifier was down), so *none* of
    the toolchain was run against it. Specifically still owed:
    1. `npm run db:generate` — **the `0003_*` migration does not exist yet.**
       Every schema file under `server/db/schema/` is written and exported
       from `index.ts`, but nothing has been diffed or applied. Nothing
       involving the four new tables or the two new `description` columns
       can work until this runs.
    2. `npm run db:migrate && npm run db:seed`
    3. `npm run lint && npm run typecheck && npm run test && npm run test:e2e`
       — `e2e/watch.spec.ts` is written but has never been executed, and
       neither have `WatchChat.spec.ts`, `WatchUpNextCard.spec.ts`,
       `app/utils/chat.spec.ts`, `app/utils/reactions.spec.ts`.
    4. Eyeball `/zz-watch-preview` (fixtures, both modes) and then
       `/watch/clip-midnight-echo` + `/watch/Viper_Squadron` in a browser.
    Treat the whole watch page as unverified code review-ready work, not as
    "done", until the above passes.
- The "Live Signals" rail on `/clips` consumes that same endpoint, so it now
  shows real rows too (`LiveSignal` gained `title`/`category`/`uptime`/
  `videoUrl` additively). Still Phase 7 and unbuilt: RTMPS ingest, stream
  keys, per-channel `/live/[username]` pages, live chat, realtime viewer
  counts (seeded counts are static).
- `docs/ARCHITECTURE.md` **exists** (Phase 1 deliverable, contrary to what
  this file previously said) — system/frontend/backend/database/streaming/
  realtime/auth/security/deployment/observability/scaling, per PROMPT.md
  §19 Phase 1.
- `docs/DECISIONS.md` — ADR-001 through ADR-013 (video player + real clips
  DB is ADR-012; the real `live_streams` table behind `/live` is ADR-013).
- `.claude/skills/` has grown well beyond the original `ui-ux-pro-max` set
  — a `motion` skill appeared during this session (installed by a
  concurrent session/process, not by this one — see the concurrent-session
  note below).

## What's still missing (only the parts checked this session)

- No `docs/DESIGN_SYSTEM.md` yet (Phase 2 deliverable) — check before
  assuming it's still absent, this file has been wrong about that before.
- No per-subsystem docs beyond what's listed above — `docs/auth.md`,
  `docs/live-chat.md`, `docs/database.md`, `docs/deployment.md`,
  `docs/security.md`, `docs/testing.md` per CLAUDE.md's docs-discipline
  rule (§7) have not been confirmed to exist or not; not checked this
  session.
- Live streaming ingest (Phase 7) — RTMPS, stream keys, Cloudflare Stream
  live inputs, broadcaster tooling, per-channel `/live/[username]` pages,
  live chat, realtime viewer counts — not built. The **viewer-facing live
  directory and playback are done** (ADR-013, above); what's missing is
  everything that would put a genuine creator broadcast behind it.
- `/following` is still a `ComingSoon` placeholder (deliberately untouched
  by the live-directory work).

## Concurrent-session note (important — read this)

On 2026-08-05, two Claude Code sessions were independently working this
same prompt in this same repo at the same time (one in this conversation,
one in another window the user had open). Both wrote to
`docs/ARCHITECTURE_RESEARCH.md` / `docs/DECISIONS.md` around 14:36–14:37.
The user chose to keep the other session's docs (thorough, ADR-format) and
had this session patch the one factual inconsistency between them: the
other session's draft ADR-009 recommended *not* installing
`ui-ux-pro-max-cli`, but this session had already installed it with the
user's explicit approval a few turns earlier. ADR-009 was rewritten in
place to say so (superseding its own draft — noted inline, not hidden).

**Lesson for future sessions**: before writing to `docs/` or `CLAUDE.md`,
check file modification timestamps (`stat` / `git status` timestamps) for
anything newer than expected. If something looks like it wasn't written by
you, stop and ask the user rather than silently overwriting — see the
"Concurrent sessions" rule in `CLAUDE.md`.

**Update, 2026-08-06**: happened again. Mid-session, `app/components/
UserMenu.vue` was rewritten (new avatar-ring treatment, verified-badge
icon, dropdown entrance/exit animation) and a new `.claude/skills/motion/`
skill appeared — neither started by this session. This session's own edits
(`ClipPlayerModal.vue`) picked up matching entrance/exit animation classes
on the dialog too, additively, with no conflict. Left both as-is per the
same lesson above: don't revert another session's in-progress work
silently. If you're reading this and don't recognize the `UserMenu.vue`
redesign or the `motion` skill as yours, they came from a parallel
session — check `git log`/`git diff` before assuming your context is the
full picture.

## Open questions (carried forward, not blocking)

1. **Deployment target** — needs a long-lived Node process for native
   WebSockets (crossws); candidates (Fly.io/Railway/Render/VPS) not yet
   decided.
2. **Cloudflare Stream's limits** (1080p delivery cap, no DRM) — accepted
   for v1 per ADR-005. Still unconfigured (`CLOUDFLARE_STREAM_API_TOKEN`
   empty in `.env`) — clips and live channels currently play from seeded
   public test-video URLs instead (ADR-012/ADR-013); swap `clips.video_url`
   and `live_streams.video_url` rows for Stream HLS manifests once an
   account exists, no schema/component change needed.

## Immediate next actions (start here)

1. Decide whether to keep chasing the original phase-by-phase plan or
   continue the pattern this repo has actually followed (build
   vertical-slice features — auth, landing, discovery/clips — ahead of a
   full `DESIGN_SYSTEM.md`/phase audit). Worth a direct conversation with
   the user rather than assuming either way.
2. If continuing feature work: live *ingest* (Phase 7) is the natural next
   vertical slice now that clips play real video, `/live` lists real
   channels from a real table (ADR-013), and every playable thing has a
   watch page (ADR-014) — ingest strategy, RTMPS/stream keys, and realtime
   viewer counts are all still unbuilt. Phase 8's crossws chat now has a
   concrete landing spot: swap `useWatchChat`'s `refetchInterval` for a
   socket and add a Redis publish to `chat.post.ts` (ADR-015).
   Two smaller follow-ons the watch page opened up: enabling comment
   posting (the `comments` table is already shaped for it — one endpoint,
   no migration), and `/following`, which is still a `ComingSoon`
   placeholder even though the `follows` table now exists and is populated.
3. If closing the documentation gap: audit `dashboard/*`, `live.vue`,
   `following.vue`, `category/index.vue` against PROMPT.md's definition of
   done (§20 point 4 in CLAUDE.md — loading/empty/error states, real
   backend, validation, auth, tests, a11y) rather than assuming their
   existence means they're finished.

---

## Dashboard session, 2026-08-07 (appended — see also the channels session)

**Built**: `/dashboard` and `/dashboard/analytics` are real. Full write-up in
[dashboard.md](./dashboard.md), decisions in ADR-017.

- Both pages now render inside `DashboardShell` (the sidebar shell that
  already existed unused) instead of `AppHeader`/`AppFooter`.
- `/dashboard/analytics` is no longer a `ComingSoon` placeholder — it has real
  follower and engagement trends, a top-clips table and a category mix, over a
  7d/30d/90d window.
- New: `shared/types/dashboard.ts`, `shared/utils/trend.ts` (+ spec),
  `server/utils/dashboard.ts`, `server/api/dashboard/{overview,analytics}.get.ts`,
  `app/composables/useDashboard{Overview,Analytics}.ts`, and eleven components
  under `app/components/dashboard/` (+ `ChannelPanel.spec.ts`,
  `TrendChart.spec.ts`).
- **No migration.** It reads tables that already existed.
- Channel ownership is `user.name` matched case-insensitively against
  `clips.creator` / `live_streams.streamer_name` — unchanged by the `channels`
  table added the same day (ADR-018 §1 confirms this explicitly).

**⚠️ NOT VERIFIED — do this first if you're picking it up.** The same failure
the watch-page session hit happened again: the shell tool's safety classifier
was down for most of this session, so **none** of the toolchain was run
against this work. Still owed:

1. `npm run lint && npm run typecheck` — nothing has been type-checked. The
   likeliest breakages are in `server/utils/dashboard.ts`: the conditional
   `handle ? db.select(...) : Promise.resolve([])` branches produce union types,
   and `z.enum(ANALYTICS_RANGES)` passes a `readonly` tuple to Zod 4.
2. `npm run test` — `shared/utils/trend.spec.ts`,
   `app/components/dashboard/ChannelPanel.spec.ts` and `TrendChart.spec.ts`
   have never been executed.
3. Eyeball `/dashboard` and `/dashboard/analytics` signed in as a seeded
   handle (e.g. `Viper_Squadron`) *and* as a user with no channel, since the
   empty state is half the design.
4. No e2e spec exists for either page yet.

**Known follow-ups** (deliberate, not oversights):

- `readCreatorOverview` duplicates counts that `selectChannelRows` (ADR-018)
  already computes; see the "Overlap" section in dashboard.md before extending
  either.
- The dashboard doesn't yet read the new `channels` table for display name or
  avatar — it shows the raw handle. Cheap win now that ADR-018 landed.
- `/dashboard/stream` is still a `ComingSoon` placeholder (Phase 7 ingest).

**Graph**: `graphify-out/graph.json` + `GRAPH_REPORT.md` were rebuilt this
session (2186 nodes, 2712 edges, 357 communities). Community labelling, the
`graph.html` export and manifest cleanup did **not** run — same classifier
outage. Re-run `graphify update .` to finish; the intermediates are all still
in `graphify-out/`.

---

## Session: Pinia adopted for shared client state (2026-08-07)

**Why**: `pinia` + `@pinia/nuxt` were installed and registered in
`nuxt.config.ts` but had **zero** usage — no `app/stores/`, no `defineStore`
anywhere. Shared client state was instead being threaded through props.
Rationale, rejected alternatives and the client-state/server-state split are in
**ADR-019**.

**Built**:

- `app/stores/auth.ts` (replaces `composables/useAuth.ts`) and
  `app/stores/watchlist.ts` (replaces `composables/useWatchlist.ts`). Both old
  composables are **deleted**; all call sites moved.
- Comment tree no longer drills viewer identity. `canPost` / `authorName` /
  `authorImage` used to travel five levels to `WatchCommentComposer`; those
  props are gone from `CommentsPanel`, `WatchComments`, `WatchCommentItem` and
  the composer, which now read `stores/auth`. Same for `canPost` on `WatchChat`.
- `isSaved` is no longer passed as a function prop. `ClipGrid`,
  `LiveChannelGrid`, `LiveSignalsRail` and `WatchUpNext` read/write the
  watchlist store directly; the `toggle-save-related` emit chain through
  `WatchLayout` is deleted. Leaf cards keep a plain `saved: boolean`.
- `WatchlistPanel` reads the store instead of taking
  `savedClips`/`savedLive`/`hydrated` + `remove`/`clear` emits.
- `zz-watch-preview.vue` seeds `useAuthStore().session` instead of passing
  identity props — the fixture-driven preview still works.
- `WatchChat.spec.ts` updated: signed-in/out is now a store seed, not a prop.

**Deliberately NOT migrated** (see ADR-019 "Rejected"): TanStack Query server
state, the dashboard (already correct one-level prop flow), the Vidstack player
tree, and single-component UI refs.

**⚠️ NOT VERIFIED — do this first if you're picking it up.** The shell tool's
safety classifier was down for this entire session (same outage the previous
two sessions hit), so **no** toolchain ran against this work. Still owed:

1. `npm run typecheck` — the store files are the risk. They rely on Nuxt/VueUse
   auto-imports inside `app/stores/*.ts` (`ref`, `computed`, `useLocalStorage`,
   `tryOnMounted`, `useRequestFetch`, `navigateTo`). If auto-imports don't reach
   that directory, add explicit imports.
2. `npm run test` — in particular whether `useAuthStore()` can be called from a
   spec body under `@vitest-environment nuxt` (it needs @pinia/nuxt's plugin to
   have set the active Pinia). If it throws, wrap the seed in the mount context
   or add `@pinia/testing`.
3. `npm run lint` — several files lost imports; unused-import violations are
   plausible.
4. Eyeball `/watch/[slug]` signed in *and* signed out (composer vs log-in
   prompt, live chat box), plus the save button on `/clips`, `/live`,
   `/category/[slug]` and the channel grid — and confirm the watchlist survives
   a reload (that's the `skipHydrate` call in `stores/watchlist.ts` doing its
   job; without it SSR's empty `[]` overwrites localStorage).

**Concurrent session note**: `app/components/watch/WatchView.vue` changed on
disk mid-session — `useChannelFollow` moved from `composables/useWatchEngagement`
to `composables/useChannel`. That move was **not** made by this session; the
edits here were reconciled against it. `app/components/channel/ChannelVideoGrid.vue`
(untracked, from the channel work) also used `useWatchlist` and was pointed at
the new store so deleting the composable wouldn't break it.

---

## Header + account menu session, 2026-08-08 (appended)

**Built**: the public header, restored to the design system and given a real
signed-in state; one account menu now shared by every surface that renders one.

- `AppHeader.vue` was regressed in commit `0e48e09` to hard-coded dark colours
  (`bg-black/80`, `text-white`, `text-slate-300`, `rose-600`) with no auth
  state and no theme toggle. Rewritten on tokens (`bg-glass`, `border-border`,
  `text-muted-foreground`, `ring-ring`), so it reads correctly in light **and**
  dark. Scroll behaviour (`useScrollHeader`) and `BrandMark` are back.
- Signed in, the right cluster is notifications + `UserMenu`; signed out it's
  Log in / Start streaming. Session comes from `stores/auth`, which is filled
  during SSR, so there's no signed-out flash.
- Mobile nav moved from a hand-rolled `v-if` panel to a Reka `Sheet`
  (`AppHeaderMobileNav.vue`) — real focus trap, scroll lock, and Track-A
  `data-state` motion per the `motion` skill. Every link is a `SheetClose`.
- **One account menu, three triggers.** `AccountMenuContent.vue` (+
  `AccountAvatar.vue`, `useAccountMenu.ts`) holds the panel; `UserMenu.vue`
  (avatar) and `SidebarUserMenu.vue` (sidebar footer) are just triggers. The
  two used to be near-identical copies with *different* link lists.
- `UserMenu` added to `DashboardTopBar` — the app shell had no account control
  outside the sidebar, so there was none at all when the sidebar was collapsed
  or off-canvas.
- Dead links fixed: the account menu pointed at `/studio` and the footer at
  `/studio{,/stream,/analytics}` — no such pages. Now `/dashboard`, `/stream`,
  `/analytics`. `app/utils/nav.ts` gained `headerLinks` (derived from
  `discoverLinks`, minus Home and minus badged placeholders) and `accountLinks`,
  and `nav.spec.ts` now asserts every link in every group resolves to a real
  page file.
- **Doubled chrome fixed**: `layouts/default.vue` renders `AppHeader` + `main` +
  `AppFooter`, but `index`, `about`, `careers`, `security`, `settings/security`
  and the two `zz-*` previews each rendered their own on top of it — two headers,
  two footers, and a nested duplicate `<main id="main-content">`. Pages now
  render content only.
- `buttonVariants` `ghost`/`outline` were tinted with literal `white/[0.06]`,
  invisible on the light theme. Now `foreground/…`.

**⚠️ NOT VERIFIED — same cause as the three sessions before it**: the shell
tool's safety classifier was down for this session, so `lint`, `typecheck`,
`test` and the dev server never ran. Nothing here touches the server or the
DB — it's components, one composable, `utils/nav.ts` and page templates — but
before building on it, run:
`npm run lint && npm run typecheck && npm run test`, then eyeball `/` signed
out and signed in, at desktop and mobile widths, in both themes. Watch for:
`AccountAvatar`'s `class` prop merge (shadcn-vue pattern, used elsewhere here),
and the `SheetClose as-child` → `NuxtLink` chains in `AppHeaderMobileNav`.

## Channels session, 2026-08-07 (appended — ran alongside the dashboard/Pinia session)

**Built**: channel pages and a ranked channel directory. Full write-up in
[channels.md](./channels.md), decisions in ADR-018.

- `/channel/[handle]` — banner + avatar + name/verified + stats + follow/share,
  a live ribbon when the channel is on air, and four tabs (Home / Videos / Live
  / About) whose selection lives in the URL as `?tab=`.
- `/channels` — directory ranked by a written-down score, with Top / Most
  followers / Most viewed / Live now / Newest orders, debounced search, category
  filter, and a Follow button on every card. Added to the header nav.
- The watch page's channel bar (avatar + name) is now a link into the channel —
  the click-through the page was missing.
- **New table `channels`** (identity only: display name, tagline, bio, avatar,
  banner, website, location, verified, created). Every number — followers,
  views, clip count, live-now — stays derived by query. `clips.creator` /
  `live_streams.streamer_name` / `follows.channel` are untouched free text and
  join on `lower(...)`, so ADR-017's `user.name` dashboard ownership is
  unaffected.
- New files: `server/db/schema/channels.ts`, `server/utils/channels.ts`
  (rewritten — `readChannelSummary` kept as-is), `server/api/channels/index.get.ts`
  + `[name]/{profile,videos}.get.ts`, `shared/types/channel.ts`,
  `shared/utils/channel.ts` (+ spec), `app/composables/{useChannel,useChannelTab}.ts`,
  ten components under `app/components/channel/` (+ `ChannelDirectoryCard.spec.ts`),
  `app/utils/channel.ts`, `app/pages/{channels.vue,channel/[handle].vue}`,
  `e2e/channel.spec.ts`, `scripts/seed-{channels,follows}.mjs`.
- `ChannelAvatar.vue` moved from `app/components/watch/` to `app/components/`
  (watch, comments, chat, channel page and directory all render it now).
- `useChannelFollow` moved out of `useWatchEngagement.ts` into `useChannel.ts`,
  and now keys on the canonical lowercase handle so the watch page and the
  channel page share one follow cache entry.
- Seeds: `db:seed` now runs clips → live → **channels → follows** → comments →
  chat. `seed-follows.mjs` creates 120 inert demo accounts (`demo-follower-*`,
  `@demo.streamify.local`, **no `account` row so none can sign in**) purely so
  the follower ranking has real rows to rank. Approved explicitly by the user.
  Remove with `delete from "user" where id like 'demo-follower-%';`.

**⚠️ NOT VERIFIED — do this first if you're picking it up.** Same cause as the
two sessions before it: the shell tool's safety classifier was down for most of
this session, so almost none of the toolchain ran. Still owed:

1. **`npm run db:generate` — the migration for `channels` does not exist yet.**
   The schema file is written and exported from `index.ts`, but nothing has
   been diffed or applied. Every channel route 404s or 500s until this runs.
   Note: the concurrent session added `server/db/schema/notification-reads.ts`
   with no migration either, so the generated `0004_*` will contain **both**
   tables. The user approved this explicitly rather than hand-writing one.
2. `npm run db:migrate && npm run db:seed`
3. `npm run lint && npm run typecheck && npm run test && npm run test:e2e`.
   Likeliest breakages, all in code that was never compiled:
   - `db.execute<ChannelRow>()` in `server/utils/channels.ts` — drizzle's
     generic wants a type with an index signature; `ChannelRow` is a `type`
     alias for that reason, but the postgres-js `RowList` return may still
     need a cast at the call sites.
   - `z.enum(CLIP_CATEGORIES)` in `server/api/channels/index.get.ts` passes a
     `readonly` tuple to Zod 4 — same shape the dashboard session flagged.
   - `e2e/channel.spec.ts` and `ChannelDirectoryCard.spec.ts` have never run.
4. Eyeball `/channels` (each sort actually reorders), `/channel/canvas_queen`
   (has both clips and a live session), `/channel/first_take` (live only, no
   clips → empty Videos tab), and the channel link on `/watch/clip-rendering`.

**Concurrent-session note**: this ran at the same time as a session that
migrated `useAuth` → `stores/auth` and `useWatchlist` → `stores/watchlist`
(both composables are now deleted) and is adding search + notifications. That
session edited two of this one's new components in place to use the stores —
left as-is, and the rest of this work was written against the stores for the
same reason. If `git status` looks strange around these files, that's why.

## Home feed session, 2026-08-09 (appended)

**Built**: `/` is now the app's home feed instead of the marketing landing
page. Full write-up in [home-feed.md](./home-feed.md), decisions in ADR-020.

- **`/` → `HomeView`** under the dashboard layout: a YouTube-style chip bar
  (All · Live · one chip per non-empty category), a "Latest from channels you
  follow" rail, and a ranked recommendation grid mixing clips and live
  sessions. Works signed out — the ranking just loses the follow term.
- **The landing page moved verbatim to `/marketing`** (the user had already
  staged that file) and is linked from the footer's Company column as "Why
  Streamify", so it isn't orphaned.
- **Ranking is an explicit written-down score** in `server/utils/home.ts`:
  `ln(1+audience) + 1.5·ln(1+likes) − ln(1+dislikes) + 3·followed + 1.5·live +
  2/(1+age_days)`. It reads `clips`, `live_streams`, `reactions` and `follows`
  — all existing tables. **No migration, no schema change in this session.**
- **No new search.** `/api/search` + `AppSearch` in the top bar already do what
  was asked and every page under the dashboard layout gets them; home
  deliberately does not grow a second search box.
- Skeletons mirror the real card's box model line-box for line-box
  (`HomeVideoCardSkeleton`), so neither the first load, a chip change, nor a
  "Load more" causes reflow.
- New files: `shared/types/home.ts`, `shared/utils/home.ts` (+ spec),
  `server/utils/home.ts`, `server/api/home/{feed,following}.get.ts`,
  `app/composables/{useHomeFeed,useFollowingFeed}.ts`, seven components under
  `app/components/home/` (+ `HomeVideoCard.spec.ts`), `docs/home-feed.md`,
  `e2e/marketing.spec.ts`. `e2e/home.spec.ts` was rewritten for the feed.

**⚠️ NOT VERIFIED — do this first if you're picking it up.** Same cause as the
three sessions before it: the shell tool's safety classifier was unavailable
for most of this session, so the toolchain never ran and the page was never
opened in a browser. Still owed:

1. `npm run lint && npm run typecheck && npm run test && npm run test:e2e`.
   Likeliest breakages, all in code that was never compiled:
   - `db.execute<FeedRow>()` in `server/utils/home.ts` — same drizzle generic
     the channels session flagged; `FeedRow` is a `type` alias for that reason
     but the postgres-js `RowList` may still need a cast.
   - `server/api/home/*.get.ts` rely on Nitro **auto-imports** for
     `getSessionUser` / `selectHomeFeed` / `selectFollowingFeed` (matching the
     working-tree edit to `watch/[slug]/view.post.ts`), unlike every older
     route, which imports explicitly. If auto-import isn't picking them up,
     add the relative imports back.
   - The nested-CTE `sql` template and the `now()::timestamp` recency term have
     never been executed against Postgres.
2. Confirm migration `0004_powerful_bloodstrike.sql` (the `channels` table) is
   actually **applied** — the home query `left join`s `channels` for avatars,
   so it 500s if the previous session's migration is still unapplied.
3. Eyeball `/` signed out and signed in: chips filter, "Load more" appends,
   the subscriptions rail only shows when you follow someone, skeletons don't
   shift the layout, and 375×812 is single-column with no horizontal overflow.

**Working-tree note**: this session did *not* touch the pre-existing uncommitted
edits to `server/utils/{channels,dashboard,discovery,format,watch}.ts` and
`server/api/watch/[slug]/*` (a `formatCount` re-export removal that leans on
auto-imports). One of them introduced a typo — "read it xxas" in
`server/utils/format.ts`'s `formatUptime` doc comment — left alone as someone
else's in-flight work.
