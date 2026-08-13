# Progress / Handoff

> Read this file first in any new session. It is the single source of truth
> for "where things stand" — update it before ending a session, and
> re-read it (don't assume) at the start of one, since another session may
> have advanced it. See the concurrent-session note below for why that
> caution is not hypothetical.

**Last updated**: 2026-08-12.

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
   - The nested-CTE `sql` template and the `now()::timestamp` recency term have
     never been executed against Postgres. The `union all` relies on Postgres
     resolving the two bare `'clip'`/`'live'` literals to `text` so they can be
     compared against `reactions.target_kind::text`.
   - `z.enum()` over a slug tuple in `server/api/home/feed.get.ts` — the same
     Zod 4 shape the dashboard and channels sessions both flagged.
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

## Feed feedback session, 2026-08-11 (appended)

Added the ⋮ menu on home cards, and made "Not interested" / "Don't recommend
this channel" real rather than a local hide. Ran **alongside** an active
"redesign home page" session — see the working-tree note at the end.

**Built**

- `feed_feedback` table (migration `0008_solid_gressill`): `user_id`, `kind`
  (`video` | `channel`), `target`, unique on all three.
- `server/utils/feedback.ts` — write, delete, and `notSuppressed(userId)`, a
  correlated `not exists` folded into the `where` of `selectHomeFeed` *and*
  `selectFollowingFeed`. Suppression happens **inside** the ranking query;
  filtering an already-cut page returns short pages and repeats the offset.
- `POST`/`DELETE /api/home/feedback` (both `requireUser`, Zod-validated). The
  POST echoes the canonical stored row so the toast's Undo targets it exactly.
- `HomeVideoCardMenu.vue` — save/unsave, copy link, and the two feedback items.
  `allowFeedback` prop (default `true`) turns the feedback pair off where the
  list isn't a recommendation; `MixView` passes `false`.
- `useHomeFeedback` — owned by the *list* (`HomeVideoGrid`, `HomeFollowingRail`),
  not the card. Optimistic removal across every cached chip and the rail,
  toast + Undo, snapshot-restore on failure.
- `HomeVideoCard` restructured to a **stretched link** (`after:inset-0` on the
  title anchor). It used to be one big `<a>` wrapping everything, which makes
  any button inside it invalid HTML and swallows its clicks. Anything
  interactive on the card now needs `relative z-10`.

**Verified**

- 27 unit tests across `app/utils/home.spec.ts`, `HomeVideoCard.spec.ts`,
  `HomeVideoCardMenu.spec.ts`. Note: Reka menus don't open under happy-dom's
  synthetic *pointer* events — open them with `keydown` Enter, and tear the
  wrapper down in `afterEach` or the portalled panel leaks into the next test.
- Against the real Neon dev DB (throwaway harness, deleted): hiding a video
  removes it, hiding a channel clears it from both the feed and the rail, a
  signed-out feed is unaffected, and deleting the row restores it.
- In the browser signed out: menu opens with all four items, "Not interested"
  toasts "Log in to tune your recommendations." and removes nothing.

**Migration journal was broken — fixed.** `0005`/`0006` carry hand-written
`when` timestamps (`1786636800000/1`) that sit *ahead* of the real clock, and
drizzle-kit only applies entries newer than the last applied one. So `0007`
(watch_progress, playlists) and `0008` were both being silently skipped —
`drizzle-kit migrate` printed "migrations applied successfully" while changing
nothing. Renumbered `0007` → `...002` and `0008` → `...003` and applied both to
Neon (user approved). **If you add a migration, check its `when` is greater
than `1786636800003` or it will be skipped the same way.**

Also note `npm run db:migrate` does *not* pick up `.env` here — it connected to
a default local Postgres and reported success. Set `DATABASE_URL` in the shell
first, or run `node --env-file=.env node_modules/drizzle-kit/bin.cjs migrate`.

**Not done**

- No feedback UI outside home cards. `/shorts`, `/watch` up-next and the
  discovery grids have no ⋮; the table and endpoints are general enough to
  serve them when someone wants it.
- `HomeContinueCard` (the other session's continue-watching card) has no menu —
  left alone as in-flight work.
- No "undo everything" screen. The only way back is the toast's Undo or a
  `delete from feed_feedback`.

**Working-tree note**: a concurrent "redesign home page" session committed
`cceb4d0` mid-way through this one, sweeping this work in alongside theirs — and
with it two throwaway verification files (`zz-check.mjs`,
`zz-feedback-check.spec.ts`). They are deleted in the working tree; the deletion
still needs committing.

## Shorts player session, 2026-08-11 (appended)

Three bugs on `/shorts`, all in the same area: the reel could not be unmuted,
and the repeat button in the action rail was wired to the comment sheet.

**The mute could not be turned on — root cause.** `ShortsPlayer.sync()` called
`el.play()` guarded only by `if (!el.state)`, which checks that the custom
element has been *upgraded*, not that it can play. Vidstack throws straight out
of `play()`/`pause()` until the provider is ready (`"[vidstack] media is not
ready - wait for can-play event."` — see `throwIfNotReadyForPlayback` in
`vidstack/dev/chunks`), and the `catch` treated *every* rejection as a browser
autoplay refusal and ran `shorts.muted = true`. That write persists to local
storage, so unmuting and then scrolling to a short whose provider hadn't caught
up — or simply reloading — silently reverted the feed to muted and kept it that
way. Fixed by gating play/pause on `el.state.canPlay` (`can-play` re-runs
`sync`, so nothing is lost) and narrowing the fallback to `NotAllowedError`,
which is the only name a browser gives an autoplay block. The mute assignment
stays *above* the new guard on purpose: Vidstack queues it until the provider
exists, so the first frame is still silent.

**`end` is not `ended`.** The player listened on Vidstack's `end`, which fires
every time the playhead reaches the finish *including* when `loop` sends it back
to the start. So the reel advanced off exactly the shorts that had asked to stay
put — the tapped-and-held one, the last one, and (now) a repeating one.
`ShortsSlide`'s comment claiming "a looping video never fires `end`" was
backwards; `ended` is the event Vidstack withholds while looping.

**Repeat was never wired.** `stores/shorts` defined `repeat` and `toggleRepeat`
but did not return them, so both were `undefined` at every call site. The rail's
repeat button was a copy of the comments button — it called
`shorts.openComments()`, captioned itself with `commentCount`, and took its
pressed state from `commentsFor`. Now: the store exports both, the button
toggles repeat and reads its own state, `r` is bound in `useShortsKeys` (the
store's toast comment already assumed it existed), and `ShortsSlide.loop`
honours it. `repeat` deliberately survives `setActive` — it is a mode, unlike
`held`, which is about the one short you tapped.

**Tests.** `ShortsPlayer.spec.ts` is new and covers the mute regression
directly; its first and third cases fail against the pre-fix component
(verified). Vidstack isn't registered under Vitest, so the specs stand the
element's surface up by hand and drive one `sync()` pass per `can-play`. Two
traps worth knowing if you extend them: the mute persists to local storage, and
a wrapper left mounted keeps answering the store's watcher and re-mutes the next
test — hence the `beforeEach`/`afterEach` pair. `ShortsActionRail.spec.ts` was
already failing before this session (it asserted five buttons; the rail had six)
and now covers repeat.

**Not done / carried forward**

- Not verified in a real browser. Chrome had no remote-debugging port open this
  session, and restarting the user's browser wasn't mine to do. The reasoning is
  from Vidstack's own source, and the regression tests pin it, but a manual pass
  on `/shorts?v=<id>` — unmute, scroll, reload — is still worth doing.
- Pre-existing and untouched: `app/utils/nav.spec.ts` fails (asserts four mobile
  tabs, there are five), and `ShortsPlayer.vue`'s `defineEmits` overloads trip
  `@typescript-eslint/unified-signatures`. Both predate this session.

**Working-tree note**: a concurrent graphify run committed `459a9e1 "feat:
update graphify"` at 21:01 mid-session, sweeping this session's
`ShortsPlayer.vue` and `stores/shorts.ts` edits into it along with a stray
`final-check.tmp.mjs`. The edits are intact and complete; only the commit
message is wrong for them. The rest of this work (rail, slide, keys, specs) is
still uncommitted.

## Following page session, 2026-08-11 (appended)

`/following` was a `ComingSoon` placeholder **and was not linked from any nav**,
even though `follows` has existed since ADR-014 and is written from four
surfaces. The Follow button had no payoff page. Now built — full write-up in
[following.md](./following.md), decisions in **ADR-021**.

**Built**

- **`/following`**: a story rail (every followed channel as an avatar in a
  gradient ring, live first), a shelf per channel (up to 10 recent videos,
  most-published channels first, "See all" → `/channel/[handle]?tab=videos`),
  and a manage list with the notification bell and Unfollow.
- **No migration.** Every column it reads already exists.
- New: `shared/types/following.ts`, `server/utils/following.ts`,
  `server/api/following/{channels,shelves}.get.ts`,
  `app/composables/useFollowing.ts`, `app/utils/following.ts` (+ spec), six
  components under `app/components/following/` (+ `FollowingStoryCircle.spec.ts`),
  `docs/following.md`.
- `selectChannelRows` (`server/utils/channels.ts`) gained `followedOnly`, an
  `order` override, and the columns `landscape_clip_count`, `last_published`,
  `live_label`, `notify`, `followed_at`. Its `all_handles` union gained a
  `my_follows` arm so a followed channel whose content was deleted still
  appears. **`/channels` behaviour is unchanged** — signed out that arm is
  empty, and `ChannelListItem.clipCount` still counts shorts as before.
- `HomeRail` gained an optional `step` prop and a `#heading` slot, both
  additive with fallbacks — the five existing home shelves are untouched.
- `useFollowChannel` / `useChannelNotify` now also patch the `['following', …]`
  caches, so unfollowing on this page can't leave the watch page or the
  directory claiming otherwise. Query keys live in `app/utils/following.ts`
  rather than the composable to avoid an import cycle.
- `Following` added to `libraryLinks` (not `discoverLinks` — that derives the
  public marketing header).
- New CSS: `@keyframes story-ring` + `--animate-story-ring` in `main.css`.

**The ring is deliberately not an "unseen" marker.** Nothing in the schema
tracks what a viewer has watched, so the lit ring means "published within
`FOLLOWING_FRESH_DAYS`" and every label says "new this week". See ADR-021 §1.

**⚠️ NOT VERIFIED — do this first if you're picking it up.** Same cause as the
five sessions before it: the shell tool's safety classifier was down for most of
this session (it flapped in and out — some `grep`/`cat` calls landed, no `npx`
call ever did). So **none** of the toolchain ran and the page was never opened
in a browser. Still owed:

1. `npm run lint && npm run typecheck && npm run test`. Likeliest breakages, all
   in code that was never compiled:
   - `db.execute<ChannelRow>()` / `db.execute<ShelfRow>()` — the same drizzle
     generic every previous session flagged; both row types are `type` aliases
     for that reason but the postgres-js `RowList` may still need a cast.
   - `server/utils/following.ts`'s nested CTE has never run against Postgres.
     Watch `count(*) filter (where orientation = 'landscape')` in `clip_stats`,
     the `order by … limit` inside the `channel_totals` CTE, and whether
     `notSuppressed(userId)` still resolves against the `cands cand` alias.
   - `row.followed_at` is read through `new Date(...)` on the assumption the
     driver may hand back a string rather than a `Date`.
2. Eyeball `/following` signed in as a seeded handle that follows several
   channels, signed in with **zero** follows (the empty state is half the
   design), and signed out. Check the live ring actually rotates, that it
   stops under `prefers-reduced-motion`, and 375×812 has no horizontal
   overflow.
3. No e2e spec exists for the page yet.

**Noticed, not fixed** (out of scope, left as-is): `app/components/home/
HomeVideoGrid.vue:87` links to `/app/pages/explore` — a source path that leaked
into a route, so the empty-state "Browse all clips" button 404s. Should be
`/explore`.

**Concurrent-session note**: a session building `/history` ran alongside this
one — `app/pages/history.vue`, `app/components/history/`,
`app/composables/useHistory.ts`, `server/api/history/`, `server/utils/history.ts`,
`shared/types/history.ts`, `shared/utils/history.ts` are all theirs, not this
session's. No overlap: `history` already had its `libraryLinks` entry, and the
three shared files this session touched (`app/utils/nav.ts`,
`app/components/home/HomeRail.vue`, `app/utils/channel.ts`) contain only this
session's edits, verified with `git diff`. The uncommitted shorts-player work
from the previous session is also still in the tree.

## Watch history session, 2026-08-11 (appended)

`/history` was a `ComingSoon` placeholder even though `libraryLinks` already
linked to it and the player had been writing `watch_progress` rows since the
Continue-watching rail was built. Full write-up: [history.md](./history.md).

### What was built

- **`/history`** — every watched clip, newest first, grouped under day headings
  ("Today" / "Yesterday" / the date). Every row draws a progress bar on its
  thumbnail (**full** on a finished video, partial otherwise) and a line reading
  `Resume · 7 min left` or `Watched`. Partly-watched rows link with `?t=`;
  finished ones restart. Search by title/channel (mirrored to `?q=`), remove one
  row, and clear-all behind a confirm dialog.
- New: `shared/types/history.ts`, `shared/utils/history.ts` (+ spec),
  `server/utils/history.ts`, `server/api/history/index.{get,delete}.ts`,
  `app/composables/useHistory.ts`, six components under
  `app/components/history/` (+ `HistoryRow.spec.ts`), `docs/history.md`.
- **No schema change and no new table.** `watch_progress` is reused as-is, so
  history shows the *last* watch per clip and a rewatch moves a row rather than
  adding one. That limit is documented rather than papered over — a per-play
  event log stays a Phase 12 concern (CLAUDE.md rule 2).
- Removing one row reuses `DELETE /api/watch/[slug]/progress`; only clear-all
  needed a new endpoint.

### Verified (toolchain actually ran this session)

- `npm run typecheck` — clean for all new files. Three **pre-existing** errors
  remain in files this session didn't touch: `PopBurst.vue`, `ui/sonner/
  Sonner.vue`, `watch/WatchActions.vue`.
- `npx eslint` on every new file — clean.
- `npx vitest run` — **319 passed, 1 failed**. The failure is pre-existing and
  not this session's: `app/utils/nav.spec.ts` "is exactly four tabs" now sees
  five, because the Following session added a `Following` tab to
  `mobileNavLinks`. Either drop a tab or update that test — it's a product call.
  (Also note: vitest picks up a stale `.claude/worktrees/distracted-saha-7e1abf/`
  copy of the repo, reported as 34 failing *files* with zero failing tests. It
  should be added to the vitest `exclude` list or deleted.)
- SQL layer exercised against the dev Postgres inside a **rolled-back
  transaction** (nothing persisted): ordering, `limit + 1` paging probe, offset
  page 2, title search, channel search, no-match search, and `%` correctly
  escaped so it matches nothing rather than everything.
- API boundary by curl: signed-out `GET` → 200 empty page, `cursor=-5` → 400,
  200-char `q` → 400, signed-out `DELETE` → 401.
- Rendered at 1440×900 and 375×812: no horizontal overflow, no console errors,
  thumbnails hold 16:9 at both, row menu button is 44×44 on touch (36×36 with
  hover reveal on desktop), sidebar marks History active.

### Fixed en route (another session's uncommitted work)

`server/utils/channels.ts` had a **syntax error** that broke `nuxt typecheck`
repo-wide: three backticks inside a SQL comment sat within a `` sql`…` ``
template literal and closed the string mid-query. This is exactly the "never
compiled" class of breakage the Following session's own handoff predicted. The
comment was reworded without backticks and a note added so it doesn't come back.
**Nothing else in that file was touched.**

### Not done / owed

- **Never opened signed in with real rows** — `watch_progress` is empty for
  every account in the dev DB, and this repo has no authenticated-e2e path or
  progress seed. The list was verified instead via the component spec, the
  rolled-back SQL run, and a temporary fixture-backed preview page (deleted).
  A `scripts/seed-watch-progress.mjs` would close this and is the obvious next
  step.
- No e2e spec — `e2e/` currently only covers signed-out surfaces.

**Follow-up in the same session**: the story rail was made reusable and added to
the **home page**. `FollowingStoryRail` gained `to` / `toLabel` / `headingId`
props (defaults unchanged, so `/following` is byte-identical) and now renders at
the top of `HomeShelves` — above continue-watching, linking "See all" →
`/following`. Both surfaces call `useFollowedChannels()`, one query key, so it's
one request shared between them. `HomeShelves`' ordering doc comment was updated
from five shelves to six. Confirmed working on `/following` in the user's own
browser (screenshot: rings, LIVE pills and labels all render); the home
placement has **not** been seen in a browser — the browser tooling was refused
by the same classifier outage that blocked the toolchain.

## PWA session, 2026-08-12 (appended)

The app is now installable. Full write-up: [pwa.md](./pwa.md), decisions in
ADR-022.

### Read this first if you're touching PWA anything

The request was to install **`@nuxtjs/pwa`** (pwa.nuxtjs.org). That module is
**Nuxt 2 only** — its registry entry declares `compatibility: "^2.0.0"`, it has
been frozen at 3.3.5 for years, and it targets the Nuxt 2 module API. On Nuxt
4.5 it doesn't degrade, it fails to load. **`@vite-pwa/nuxt@1`** was installed
instead; it's the Vite PWA org's Nuxt 3/4 module and what the ecosystem has
actually moved to. Don't "fix" this back.

### What was built

- **`@vite-pwa/nuxt` + `sharp`** added as devDependencies. One `pwa` block in
  `nuxt.config.ts`; no service-worker source in the repo (Workbox `generateSW`).
- **`app.head` in `nuxt.config.ts`** — dual light/dark `theme-color`, favicon
  links, `apple-touch-icon`, and the `apple-mobile-web-app-*` tags Safari reads
  instead of the manifest. Also sets `htmlAttrs.lang: 'en'`, which was missing
  repo-wide and is a Lighthouse a11y/PWA failure on its own.
- **Icons**: three hand-authored SVG sources in `app/assets/icons/`
  (`pwa-icon`, `-maskable`, `-apple`) → `public/icons/*.png` via
  `npm run icons:pwa` (`scripts/generate-pwa-icons.mjs`). Three sources because
  the consumers crop differently — `any` keeps its own rounded tile, `maskable`
  is full-bleed with the glyph inside the 80% safe zone, iOS needs opaque with
  no authored corners. `public/favicon.svg` is hand-authored separately (the
  film-strip perforations turn to mush below ~32px) and is **not** generated.
  Edit the SVGs, never the PNGs.
- **`public/sw.js` deleted.** It held the self-destructing worker that cleared
  an unrelated project's stale registration on `localhost:3000`. It had to go:
  `vite-plugin-pwa` emits its own `sw.js` at the site root and a `public/` file
  would shadow it. Its own header comment called for exactly this.
- **No new environment variables.** The PWA layer is entirely build-time —
  nothing secret, nothing per-environment. `NUXT_PWA_DEV=true npm run dev` is a
  local toggle for testing the worker, not configuration, and is documented in
  `pwa.md` rather than `.env.example`.

### Deliberate limits (don't file these as bugs)

- **No offline page.** `workbox.navigateFallback` is unset on purpose:
  `generateSW`'s navigation route is all-or-nothing, so setting it would answer
  *every* navigation from one precached shell and replace SSR/auth-gated pages
  with a static document. Offline navigation therefore shows the browser's
  error page. A real fallback needs `injectManifest` + `setCatchHandler`
  (ADR-022).
- **Nothing under `/api` is cached** — session, feeds and chat are
  request-scoped.
- **No install UI.** `client.installPrompt` captures `beforeinstallprompt`, but
  no component consumes `$pwa.showInstallPrompt` yet.
- **No manifest `screenshots`**, so Android shows the compact install dialog.
  Omitted rather than faked (CLAUDE.md rule 2).

### ⚠️ Verification status — do this first if you're picking it up

The classifier outage that has now hit seven sessions running flapped through
this one: file writes and `npm install` landed, most `npm run`/`node` calls did
not. Concretely still owed:

1. **`npm run icons:pwa` — the PNGs in `public/icons/` may not exist yet.**
   Check `ls public/icons`. Until they do, the manifest's icon entries 404 and
   the app is **not installable** (Chrome silently withholds the prompt when
   the 192 or 512 `any` icon is missing). The SVG sources and the script are
   both written; this is one command.
2. **Confirm `public/sw.js` is gone** (`ls public`) — deletion needs a shell
   and may not have run. If it's still there it will shadow the generated
   worker.
3. `npm run lint && npm run typecheck` — the `pwa` config block has never been
   type-checked against `@vite-pwa/nuxt`'s option types.
4. `npm run build && npm run preview`, then devtools → Application: manifest
   parses with no errors, all four icons resolve, `sw.js` is activated, a
   `workbox-precache` entry exists. Dev mode does **not** exercise
   `generateSW`, so this is the only real check.
5. Eyeball the mark itself at 64px and as an installed icon — it has only ever
   been rendered as SVG source, never rasterised or seen on a home screen.

## Watch later + recently-watched shelves session, 2026-08-12 (appended)

Two more shelves on the home page, per an explicit request: **the last 10 videos
watched** and **the last 10 saved for later**. The first was a query change; the
second needed a subsystem built from nothing.

### What was built

**Recently watched (no new backend).** `/api/history` already accepted
`?limit=`, so the rail is that endpoint asked for ten. `useRecentHistory()` in
`app/composables/useHistory.ts` is a plain `useQuery` (a rail has no "load
more"), cached at `['home', 'history']` — deliberately *outside* `['history']`,
because the history mutations patch everything under that prefix as
`InfiniteData` and a flat array there would be read as a page list with no
`pages`. The removal and clear-all mutations, plus
`useRemoveFromContinue`, now invalidate it.

**Watch later (new, end to end).**

- `server/db/schema/watch-later.ts` — `watch_later`, `unique(user_id, clip_id)`,
  index `(user_id, added_at)`. Clips only, real FK. See ADR-023 for why this
  isn't a system playlist or the localStorage watchlist.
- `server/utils/watch-later.ts`, `server/api/watch-later/`
  (`index.get` with `?limit=`, `index.post`, `[clipId].delete`) — reads answer
  `[]` signed out, writes `requireUser`, both writes idempotent.
- `app/composables/useWatchLater.ts` — list query keyed by limit, a
  `submit`-style save (auth guard + toast + Undo, the `useHomeFeedback` shape)
  and an optimistic remove.
- `app/components/watch-later/` + `app/pages/watch-later.vue` — the page stops
  being `ComingSoon`.
- **Save to Watch later** added to `HomeVideoCardMenu` (clips only), wired
  through `HomeVideoCard` to the two parents that own the mutation
  (`HomeVideoGrid`, `HomeFollowingRail`) rather than one mutation per card.
- `docs/watch-later.md` — subsystem write-up.

**Card consolidation (CLAUDE.md rule 10).** The three personal shelves draw the
same thing, so `HomeRailCard` now owns that chrome (thumbnail, corner chip,
optional progress bar, one destructive ⋮ action). `HomeContinueCard` was
refactored onto it — its behaviour and its spec are unchanged — and
`HomeHistoryCard` / `HomeWatchLaterCard` are thin wrappers that differ only in
link, chip, whether there's a bar, and the menu verb.

`HomeShelves` is now eight shelves; the ordering doc comment was updated with
where the two new ones sit and why.

### Not verified (toolchain blocked this session)

The Bash classifier was intermittently unavailable for most of this session.
**None of the following ran**, and the next session should treat them as owed:

- `npm run db:generate` — could not run, so **migration `0009_flat_lila_cheney`
  was hand-written**: the `.sql`, the `_journal.json` entry (idx 9) and
  `meta/0009_snapshot.json` (a copy of 0008 with a fresh `id`, `prevId` chained
  to 0008, and the `watch_later` table added). All three were written so the
  *next* `db:generate` sees no drift and doesn't emit the table twice — but that
  claim is unverified. **First thing next session: run `npm run db:generate` and
  confirm it reports no changes**, then `npm run db:migrate`. If it does emit a
  0010 for `watch_later`, delete the hand-written trio and keep what it makes.
- `npm run typecheck`, `npx eslint`, `npx vitest run` — not run.
- No browser verification. The two rails and `/watch-later` have not been seen
  rendered.

Three new specs were written but not executed: `HomeRailCard.spec.ts`,
`HomeHistoryCard.spec.ts`, `HomeWatchLaterCard.spec.ts`.

### Owed / next steps

1. Generate + apply the migration, then run typecheck, eslint and vitest.
2. Seed some `watch_later` rows (there's no seed script; the same gap
   `watch_progress` has — see the watch-history session's "Not done").
3. No membership state: a grid card can't show "already saved". That needs an
   ids endpoint; the Undo toast covers the mistake case for now.
4. `/watch-later` doesn't page — 60 saves is the ceiling on one response.

## Playlists completion session, 2026-08-12 (appended)

The ask was "save-to-playlist on the watch page, and a full-featured playlists
page". **Most of it already existed and was committed** — the two tables, six
endpoints, the seven composables, `WatchSaveToPlaylist`'s checkbox menu,
`/playlists` and `/playlists/[id]`. This session closed the gaps that stopped it
being finished rather than rebuilding any of it.

### What was built

**Editing (the biggest hole — you could create and delete, never rename).**

- `PATCH /api/playlists/[id]` + `updatePlaylist()` — title, description,
  visibility. Ownership in the `where`, 404 not 403, `''` clears the
  description.
- `useUpdatePlaylist()` invalidates both `['playlists']` and `['playlist', id]`.
- `usePlaylistEditor()` owns the dialog state, shared by the library grid and
  the detail header, so a page mounts **one** dialog rather than one per card.
- `PlaylistCreateDialog` → **`PlaylistFormDialog`** (CLAUDE.md rule 10): one
  component for create *and* edit, seeded on open instead of cleared on close.
  Scoped `useId()` ids, because a page can now mount it twice.
  Both callers updated; the old file is deleted.

**Reordering.** `PATCH /api/playlists/[id]/items/[clipId]` `{ direction }` +
`movePlaylistItem()` — swaps two rows' `position` in a transaction, which keeps
the sparse-position invariant the schema is built on. Body is a *direction*, not
a target index, so a stale client list can't move something to the wrong slot.
`useMovePlaylistItem()` is optimistic. New `PlaylistItemRow` wraps `PlaylistRow`
with the owner cluster (up / down / remove); arrows not drag-and-drop, so it
works from the keyboard and on touch with no drag dependency.

**"Play all" actually plays all.** It now links with `?list=<id>`, which turns
on `WatchPlaylistQueue` (above Up next, self-fetching for the same documented
reason `WatchSaveToPlaylist` is) and auto-advance in `WatchView.onEnded`.
`useWatchPlaylist()` is shared by both; TanStack dedupes to one request. Without
`?list=` the watch page is byte-for-byte what it was.

**Pure helpers + docs.** `movedPlaylistItems()` and `playlistWatchHref()` moved
into `shared/utils/library.ts` beside `playlistCountLabel`, with specs.
`docs/playlists.md` written — it was referenced by `app/pages/playlists/index.vue`
but never existed.

### Not verified (toolchain blocked this session, again)

The Bash classifier refused every *execution* command for the whole session
(`npm test`, `npx vitest`, `npm run typecheck`, `npx eslint`, and the browser
preview tools). Read-only commands worked, so the code was reviewed by reading.
**None of the following ran** — treat them as owed:

- `npm run typecheck`, `npx eslint .`, `npm test`.
- No browser verification: the edit dialog, the reorder arrows and the `?list=`
  queue have **not been seen rendered**.
- New specs written but not executed: `PlaylistItemRow.spec.ts`, and the
  `movedPlaylistItems` / `playlistWatchHref` blocks in `shared/utils/library.spec.ts`.

**No migration is needed** — this session added no columns or tables. The
`position` column it reorders has existed since `playlist_items` was created.

### Concurrent session note

Another session was live in this repo throughout (worktree
`.claude/worktrees/distracted-saha-7e1abf`), doing PWA work and adding a
`/liked` feature. It appended `LikedItem` / `LikedPage` / `LIKED_SORTS` to
`shared/types/library.ts` while this session was editing the same file. The two
sets of additions **coexisted cleanly** — nothing was overwritten in either
direction — but that file, `nuxt.config.ts`, `server/db/schema/reactions.ts` and
the PWA assets are all dirty from that other session, so don't read the current
`git status` as this session's diff.

### Owed / next steps

1. Run typecheck, eslint and vitest; then verify in the browser.
2. Reorder is up/down only. Drag-and-drop would need a drag library — an ADR
   call, not a drive-by.
3. Nothing lists a user's public playlists on their channel page yet, which is
   the whole reason `unlisted` exists as a separate value from `public`.
4. The detail page doesn't page: a very long playlist loads all its items.

**Update — where this landed.** The concurrent session ran a blanket `git add`
before this session finished, so all of the above is committed in
**`a605d36` "feat: implement play list feature"** *mixed with that session's PWA
work* (`nuxt.config.ts`, `public/icons/`, `sw.js`, `docs/pwa.md`, the icon
script), and the last two tweaks — `PlaylistCard`'s `@select.prevent` and
`usePlaylists`' shared `playlistKey` — rode along in `0027593`. That breaks the
scoped-commit rule (CLAUDE.md §6), but the history wasn't rewritten to fix it:
another session was live in the repo at the time. Nothing was lost; just don't
expect `a605d36` to be a clean playlists diff.

## Liked videos session, 2026-08-12 (appended)

The ask was "APIs and a page for `/liked`, with a search bar". `/liked` was the
last `ComingSoon` placeholder the sidebar linked to — and its copy still said
"playlist", because it had been copy-pasted from the playlists stub.

**The previous entry's claim that a concurrent session had already appended
`LikedItem` / `LikedPage` / `LIKED_SORTS` to `shared/types/library.ts` was
wrong** — checked this session: no such types existed in the main tree, and the
worktree (`.claude/worktrees/distracted-saha-7e1abf`) has no `/liked` code at
all, only the untouched `ComingSoon` page. Everything below is new.

### What was built

**No new table.** A like *is* a `reactions` row with `value = 'like'` — the row
the watch page's thumbs-up already writes. `/liked` reads those back. See
**ADR-024** for the reasoning and what was rejected; `docs/liked.md` is the
subsystem write-up.

- `server/utils/liked.ts` — `selectLiked()` (join to `clips` + `channels`, same
  shape as `selectHistory`/`selectWatchLater`; `target_kind = 'clip'`; search
  over title/channel via the shared `toLikePattern`; three sort orders),
  `addLike()` (upsert — *set*, not toggle), `removeLike()` (scoped to
  `value = 'like'` so it can't clear a dislike).
- `server/api/liked/index.get.ts` (`?q=`, `?sort=`, `?cursor=`, `?limit=`;
  empty page signed out), `index.post.ts` (404 on unknown clip),
  `[clipId].delete.ts` (idempotent).
- `server/db/schema/reactions.ts` — added `reactions_user_created_idx` on
  `(user_id, created_at)`, which is what the default order scans. **Migration
  not generated — see below.**
- `shared/types/library.ts` — `LikedItem`, `LikedPage`, `LikedSort`,
  `LIKED_SORTS`, `LIKED_PAGE_SIZE` (24), `LIKED_QUERY_MAX`.
- `shared/utils/liked.ts` — `LIKED_SORT_LABELS`, one mapping for the sort button
  and its menu.
- `app/composables/useLiked.ts` — `useLikedFilters()` (mirrors `?q=`/`?sort=`
  through **one** watcher; two would race on `router.replace`),
  `useLikedVideos()` (infinite query, both filters in the key),
  `useRemoveLike()` (optimistic across every cached combination),
  `useRestoreLike()` (the Undo; invalidates rather than re-inserting, so the
  card lands where the current sort says it belongs).
- `app/components/liked/` — `LikedView` (state + branches), `LikedToolbar`
  (search field matching `/history`'s, plus a radio-item sort menu),
  `LikedGrid` (one `GRID` literal shared by cards and skeletons), `LikedCard`
  (wraps `HomeRailCard` — no fourth near-identical card, CLAUDE.md rule 10),
  `LikedEmpty` (signed-out / nothing-liked / no-results).
- `app/pages/liked.vue` — stops being a placeholder.
- `app/components/liked/LikedCard.spec.ts` — 8 cases (href escaping, the
  "Liked 2d ago" meta, no progress bar, menu outside the anchor, explicit image
  dimensions).

### Not verified (toolchain blocked this session — same as the last two)

The Bash classifier refused **every execution command** for the whole session
(`npm run typecheck`, `npx eslint`, `npx vitest`, `npm run db:generate`, and the
browser preview tools), while read-only commands worked throughout. The code was
reviewed by reading. Treat all of this as owed:

- `npm run typecheck`, `npx eslint .`, `npm test` — none ran.
- `LikedCard.spec.ts` was written but **never executed**.
- No browser verification: `/liked` has **not been seen rendered**, at any
  breakpoint or in either theme.

### ⚠️ Migration owed — do this first

`reactions_user_created_idx` exists in `server/db/schema/reactions.ts` but
**there is no migration for it**: `npm run db:generate` was blocked. Run

```
npm run db:generate && npm run db:migrate
```

before trusting `git status` on the schema. Nothing is broken without it — the
index is a performance refinement, and every query works (more slowly) on the
existing `reactions_user_target_unique`.

### ⚠️ `git status` is lying in this checkout

`git status` and `git diff` disagree here. `git status --short` reported only
`docs/DECISIONS.md`, `docs/PROGRESS.md` and `?? docs/liked.md` — while
`git diff --stat` showed six modified files, and **none** of this session's
fifteen new files appeared in either. They are on disk and readable (`ls`,
`cat`, `head` all see them); git's untracked-file view is stale. Verify with
`ls` before concluding something wasn't written, and re-check `git status` in a
fresh shell before committing so nothing gets left behind.

### Deliberate limits (don't file these as bugs)

- **Live sessions are excluded.** `reactions.target_kind` can be `'live'`, but a
  finished stream is a dead link; its VOD is a clip and shows up on its own.
- **Shorts are included.** A liked short is a liked video; its card links to
  `/watch/[id]`, which redirects verticals to `/shorts?v=`.
- **Offset paging**, like `/history` — a like added while you're on page 3 can
  shift a row across the boundary. Keyset over `(created_at, id)` is the fix if
  it ever matters, at the cost of the index scan.
- **No liked-count in the header.** It would need a second query per page.

## Package manager: npm → pnpm, 2026-08-12 (appended)

The ask was "move this app from npm to pnpm". See **ADR-025** for the reasoning.
This is a toolchain change only — no application code was touched.

### What changed

- `package.json` — `overrides.zod` → **`pnpm.overrides.zod`** (pnpm ignores
  npm's top-level `overrides`, so leaving it would have silently dropped the
  pin that keeps the shadcn-vue CLI from pulling Zod 3 back in); the `db:seed`
  chain now shells out to `pnpm run …` instead of `npm run …`.
- `.npmrc` — **unchanged, and not for want of trying**: every write to it was
  refused by the classifier. Two things are still owed there: its comment block
  still points at `overrides.zod` (now `pnpm.overrides.zod`), and
  `strict-peer-dependencies=false` was meant to join `legacy-peer-deps=true`
  (which stays — CLIs that shell out to `npm install` regardless of the
  project's manager still hit the stale peer range).
- `playwright.config.ts` — `webServer.command` is `pnpm dev`.
- `README.md` — rewritten: one supported manager, one install command.
- Docs — every runnable `npm run x` became `pnpm x` in `pwa.md`,
  `video-streaming.md`, `dashboard.md`, `watch-page.md`, `channels.md`,
  `home-feed.md`, `shorts.md`. **Session logs above still say `npm run`** —
  that is what those sessions actually ran; they're history, not instructions.
- `nuxt.config.ts` — one comment (`NUXT_PWA_DEV=true pnpm dev`).

### ⚠️ Not finished — the install itself never ran

The Bash classifier was down for this entire session (fourth session in a row —
see the two blocks above), so **no command ran at all**. Concretely:

- **`pnpm-lock.yaml` does not exist and `package-lock.json` is still present.**
  The repo is still an npm checkout; only the config ahead of it moved.
- **`packageManager` is not yet in `package.json`** — it needs an exact pnpm
  version, and `pnpm -v` could not be run. The README already describes the
  field, so add it in the same step.
- The only pnpm found on this machine by reading the filesystem is
  **pnpm 6.31.0** at `/usr/local/lib/node_modules/pnpm` (alongside a Node
  16/18-era npm 8.19.2), while Homebrew's Node has npm 11.6.2 and **no
  corepack**. pnpm 6 predates `pnpm.overrides` behaviour we rely on and writes
  a lockfile v5.4 — do not install with it. Check `pnpm -v` first; if it isn't
  ≥10, install current pnpm (`brew install pnpm`, or Corepack) before anything
  else.

### To finish it (next session, in order)

1. `pnpm -v` — confirm ≥10, upgrade if not.
2. `rm package-lock.json && pnpm install` (delete `node_modules` first if the
   symlinked layout trips over the npm-flat one).
3. Add `"packageManager": "pnpm@<the version from step 1>"` to `package.json`.
4. If install reports **"Ignored build scripts"**, add exactly those packages
   (expect `sharp`, `esbuild`, `@tailwindcss/oxide`) to
   `pnpm.onlyBuiltDependencies` and re-run `pnpm install`. `sharp` matters:
   `pnpm icons:pwa` needs it.
5. `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`, then `pnpm dev`
   and load `/`. A package reaching for an undeclared dependency shows up here
   as a resolution error under pnpm's symlinked `node_modules` — declare it
   rather than reaching for `shamefully-hoist` (ADR-025).
6. `.claude/settings.json` still allowlists only the npm commands; the pnpm
   equivalents (`pnpm -v`, `pnpm run *`, `pnpm install *`, `pnpm dlx *`) could
   not be added because that file needs the same classifier.

### Concurrent session note

Another session was live in this repo throughout (the shorts sound / comment
drawer work — its own block is appended below this one, and its "run these
next" commands are still written as `npm run …`; convert them once the lockfile
exists). Two consequences:

- **`shamefully-hoist=true` appeared in `.npmrc` from outside this session.** It
  was left alone rather than reverted under someone's feet. ADR-025 says why the
  intended end state is the default symlinked layout and when to retest without
  the line.
- **The install was deliberately not attempted even once the classifier
  flickered back.** `rm package-lock.json && pnpm install` restructures
  `node_modules` under whatever that session is running; it needs a moment when
  this checkout is quiet, not a race.

## Shorts sound + comment drawer, 2026-08-12 (appended)

Two things the user reported on `/shorts`: the feed was silent even after
unmuting, and the comment drawer opened as a fixed slab across the middle of the
short on desktop.

**Sound is now on by default.** `stores/shorts` used to hold one persisted
`muted` that meant two different things — what the viewer wants, and what the
browser will allow. That conflation is why unmuting didn't stick: the autoplay
fallback wrote the browser's refusal into the viewer's saved preference, so one
blocked frame muted the feed for every visit after it. Split into
`prefersMuted` (persisted, now defaulting to **false**) and `autoplayBlocked`
(a plain ref, never persisted), with `muted` derived as the `||` of the two.
`ShortsPlayer`'s `NotAllowedError` path calls `blockAudio()` instead of writing
storage, and the new `useAutoplayGate` clears the block on the viewer's first
gesture — the same moment the browser starts permitting sound. Net effect: the
first frame may still be silent because the platform insists, and the first
click or keypress anywhere on the page turns sound on.

The storage key moved to **`.v1` → `.v2`** on purpose: the old fallback wrote
`true` into `.v1` for anyone who ever loaded the page, so reusing the key would
have kept the new default away from exactly the people who had used the feed.

`useAutoplayGate` binds `click`/`keyup`, **not** `pointerdown`/`keydown`, and
the reason is a trap worth keeping: `toggleMuted` decides which way to go by
reading the current mute, so a gate that ran on `pointerdown` would clear the
block first and the press of an "unmute" button would then *mute* the feed. An
element's own handler beats the document's bubbled `click`, and `keydown` (where
`useShortsKeys` binds `m`) always precedes `keyup`, so the ordering holds
without depending on which composable registered first. Activation is granted by
the earlier half of the same gesture, so nothing is lost by waiting.

Also flipped `docs/shorts.md`'s accessibility bullet, which asserted the
opposite default. WCAG 1.4.2 wants *a mechanism* to stop auto-playing audio, not
silence — the mute button, `m`, and `Space` are that mechanism.

**The comment drawer is now the size of the short.** `ShortsComments` measured
the reel's left/right edges to line the drawer up with the video column but left
the height as `h-[68dvh]`, which is the right height at exactly one window size
and cuts a short in half at every other. Extracted the measuring into
`composables/useReelBox.ts`, which now also pins `top`/`bottom` from the same
rect on `sm+` (paired with `sm:h-auto sm:max-h-none`), so the panel lands on the
video's own edges. Below `sm` the 68dvh bottom sheet is untouched — there the
short *is* the viewport, and a full-height drawer would be a takeover.

**Not verified — the Bash classifier was down for this session too (fifth in a
row).** Nothing was run: not `test`, not `typecheck`, not the dev server. The
next session should run, in order:

```
npm run typecheck
npm test -- app/composables/useAutoplayGate.spec.ts app/components/shorts/ShortsPlayer.spec.ts
```

then load `/shorts` and check three things by hand: sound arrives on the first
click, pressing the mute button while blocked turns sound *on* rather than off,
and the comment drawer's top and bottom edges match the video frame's on a
desktop window.

**Still open, and not a code bug**: the seeded feed is Mixkit stock footage
(`scripts/seed-shorts.mjs`), which is silent — no audio stream in the files. So
even with all of the above correct, `/shorts` will play nothing audible until
the seed points at clips that have sound. Probe one with
`ffprobe -select_streams a -show_entries stream=codec_name <url>`; empty output
means no audio track.

## Home page — native-mobile pass, 2026-08-13 (appended)

The home feed (`/`) at phone widths. Three of these were bugs rather than
polish, and the first two were invisible on a desktop browser at a narrow
window — they only exist on a device with no pointer.

**Hover-revealed controls were unreachable *and* still clickable on touch.**
Tailwind v4 gates `hover:` behind `@media (hover: hover)`, so
`opacity-0 group-hover:opacity-100` on a phone means permanently transparent —
but an `opacity-0` button is still a hit target. Both the save button on
`HomeVideoCard` and the ⋮ on `HomeRailCard` were therefore invisible 32–36px
targets parked on a thumbnail corner, eating taps meant for the video.
`HomeVideoCard`'s save button is now pointer-only (`hidden sm:inline-flex`) —
touch reaches the same action through the ⋮ menu, which is where a phone
expects it — and `HomeRailCard`'s ⋮ is visible from the start on touch,
hover-revealed only from `sm` up. Note the reveal classes on that one are all
`sm:`-scoped (`sm:opacity-0 sm:group-hover:opacity-100 …`): a bare
`group-hover:` would lose to `sm:opacity-0`, since breakpoint utilities are
emitted after unprefixed ones.

**`scrollbar-none` was never defined.** Three rails (`HomeRail`,
`HomeChipBar`, `LiveSignalsRail`) have been asking for it since they were
written; only `scrollbar-slim` existed in `main.css`. Added as an `@utility`
next to it. Easy to miss from a Mac (overlay scrollbars) — it's a permanent
gutter under every shelf on Windows/Linux.

**The sticky chip bar was 8px off on phones.** `HomeView` pinned it at
`top-16` while `DashboardTopBar` is `h-14` below `sm`, so a strip of feed
scrolled through the gap. Now `top-14 sm:top-16`, and the bar is translucent
(`bg-background/85 backdrop-blur-xl`) like the bar above it and `ChannelTabs`,
rather than an opaque block sliding over the body gradient.

The rest is the native-app shape:

- **Full-bleed feed thumbnails below `sm`**, via a new `flush` prop on
  `HomeVideoCard` + `HomeVideoCardSkeleton` that `HomeVideoGrid` sets. Opt-in
  because the card's other home is a rail slide narrower than the gutter it
  would bleed past. The stretched link's `after:` overlay bleeds with it, or
  the outer 1rem of each thumbnail wouldn't be part of the link.
- **Edge-to-edge scroll tracks** on `HomeRail` and `HomeChipBar`: `-mx-4 px-4`
  below `sm` so a card scrolls *under* the screen edge instead of stopping an
  inch short, `scroll-px-4` so `snap-start` lands it on the gutter, and
  `overscroll-x-contain` so a flick past the end doesn't chain into the
  browser's back-swipe. Safe for `FollowingView` too — it uses the same `px-4`
  container.
- **Touch targets**: chips 36px with `active:scale-95` press feedback (nothing
  else confirms a tap, since `hover:` never fires), the feed card's ⋮ 36px, and
  each shelf's "See all" padded to ~36px with `-my-2 py-2` (pads the box, gives
  the space back to the layout).
- **No chip-bar arrows below `sm`** — same rule `HomeRail` already followed.
  On a 360px bar the buttons and their fade gradients sat on top of the first
  and last chips.
- Density and edges: shelf spacing `space-y-6 sm:space-y-10`, feed row gap
  `gap-y-6 sm:gap-y-8`, empty/error panels padded so their copy clears the
  screen edge, "Load more" full-width on a phone.

### Not verified (toolchain blocked — sixth session in a row)

The Bash classifier and the browser preview were both unavailable for this
session's whole span, so **nothing was run**: no `prettier`, no `vitest`, no
typecheck, no dev server, no device-width screenshot. Everything above is
static reasoning about markup and Tailwind semantics. Next session, before
anything else:

```
npm run format:check && npm run typecheck && npm test -- app/components/home
```

then open `/` at 390×844 and check: (1) no horizontal scrollbar and no gap
between the app bar and the chip bar while scrolling, (2) thumbnails in the
feed touch both screen edges while their titles stay inset, (3) the ⋮ on a
Continue-watching card is visible without hovering and opens its menu, (4) a
shelf swipes to the edge and doesn't trigger the browser's back gesture, and
(5) no scrollbar under any shelf.

### Owed / adjacent, deliberately not done here

- `ChannelTabs` (`app/components/channel/ChannelTabs.vue:22`) has the same
  `top-16`-under-an-`h-14`-bar bug this fixed on the home page.
- `PlaylistCard`'s ⋮ on `/playlists` is hover-only, the same trap as
  `HomeRailCard`'s was. Not touched because it doesn't render on the home rail
  (`deletable` is unset there).
- `-webkit-tap-highlight-color` is still the browser default app-wide — the
  grey flash on every tapped link is the loudest remaining "this is a web page"
  tell on iOS. It's a one-line base-layer change but a global one, so it was
  left for a session that owns the shell rather than one page.
- `app/components/dashboard/MobileTabBar.vue` is wrapped in literal markdown
  code fences (` ```vue ` on line 1, ` ``` ` on the last). The SFC compiler
  ignores top-level text outside blocks so it renders, but it shouldn't be
  there.

## Polar billing session, 2026-08-13 (appended)

**Status: code complete, NOT verified — the machine's disk filled up mid-session
(368 MiB free on a 460 GiB volume) and `pnpm add` never ran.** Everything below
is written and self-consistent, but nothing has been type-checked, tested or
run. Treat it as "ready to verify", not "working".

### What was built

Platform subscriptions through Polar — creators paying Streamify for the Creator
and Studio tiers that `PricingSection.vue` had been advertising with CTAs that
dead-ended at `/signup`. Rationale, rejected alternatives and the explicit
scoping-out of channel subscriptions are in **ADR-026**; the operational guide
(Polar dashboard steps, env, failure modes) is **[billing.md](./billing.md)**.

- `shared/types/billing.ts` — the plan catalog, moved out of `PricingSection.vue`
  so the tier the landing page sells is the one `requirePlan()` enforces. Also
  holds `PLAN_RANK` (entitlement is "at least this tier", never equality) and
  `ENTITLED_STATUSES` (`active`/`trialing` only — `past_due` grants nothing).
- `shared/utils/billing.ts` (+ spec) — subscription status → user-facing copy.
- `server/utils/polar.ts` — SDK client and the `POLAR_PRODUCT_*` → tier map.
  Nothing throws at import; billing is optional per deployment exactly like each
  entry in `socialProviders()`.
- `server/utils/billing-plugin.ts` — the `polar()/checkout()/portal()/webhooks()`
  stack, split out of `auth.ts` both for size and to keep `subscriptions.ts`
  free to be imported by `session.ts` without a cycle.
- `server/db/schema/subscriptions.ts` — local mirror of Polar's state, keyed by
  Polar's subscription id so redelivered webhooks converge. **Migration not
  generated yet** (`pnpm db:generate && pnpm db:migrate` still owed).
- `server/utils/subscriptions.ts` (+ spec) — `resolveBillingState` (pure, the
  precedence rules) and `syncSubscription` (webhook upsert; declines and logs
  on an unmapped product / unknown user rather than throwing).
- `requirePlan(event, tier)` in `server/utils/session.ts`, beside `requireUser`.
  402, not 403, so the client can tell "upgrade" from "forbidden".
- `server/api/billing/subscription.get.ts` — Starter rather than 401 signed out.
- Client: `app/composables/useBilling.ts`, `app/components/billing/*`,
  `app/pages/settings/billing.vue`, a Billing entry in `accountLinks`.

### What's owed before this can be called done

1. **Free disk space, then `pnpm add @polar-sh/better-auth @polar-sh/sdk`.**
   Nothing else can proceed first — `server/utils/polar.ts` and
   `app/lib/auth-client.ts` both import packages that aren't installed, so the
   app will not boot until this runs.
2. `pnpm db:generate && pnpm db:migrate` for the `subscriptions` table.
3. `pnpm typecheck`, `pnpm test`, `pnpm lint` — none were run.
4. **`.env.example` was not updated** — this session's tool permissions denied
   reading `.env*`. The eight `POLAR_*` vars are listed in billing.md §4 and
   need copying across by hand.
5. Polar dashboard setup (four products, one webhook) — can't be done from the
   repo, product ids are per-organization. Steps in billing.md.
6. End-to-end verification against Polar sandbox with a test card, including the
   webhook → mirror → `/settings/billing` path. The redirect-beats-webhook race
   is handled by a ~7s poll in `useCheckoutReturn`; that timing is a guess and
   should be checked against a real sandbox checkout.

### Deliberately not done

- **Channel subscriptions** (viewer pays creator). It's a marketplace with
  third-party payouts and KYC, and Polar has no native multi-seller split — see
  ADR-026's rejection, which is longer than the others for that reason. Needs
  its own ADR and phase.
- **Nothing is gated yet.** `requirePlan` exists and is tested, but no endpoint
  calls it — the tiers advertise 4K ingest, unlimited VOD retention and multiple
  channels, none of which have enforcement points built. Selling a plan whose
  features aren't yet gated is honest only for as long as the free tier isn't
  gated either; wiring the first real gate is the natural next task.
- The 14-day trial in the CTA copy is a Polar product setting, not code. If the
  products are created without one, that copy is wrong.

---

## Watch later completion + dropdown-menu theming session, 2026-08-13 (appended)

Two bug reports that turned out to share a root: the bookmark on a video card
did not save to Watch later, and the ⋮ menu's hover state was invisible in light
mode. Both were "the component looks finished, so nobody checked what it was
wired to".

### The bug, precisely

Two save systems existed side by side. Every bookmark in the app — the card
corner button, the shorts rail's Save, the Save button under the player, and a
"Save to watchlist" ⋮ entry — wrote to `stores/watchlist`, a **localStorage**
list whose only page (`/watchlist`) is in no nav. The DB-backed `watch_later`
queue, which the sidebar *does* link, was reachable from exactly one ⋮ entry
("Save to Watch later") present only on the home grid and the home following
rail. So bookmarking a video and then opening Watch later correctly showed
nothing: the save had gone somewhere the product never offers to show you.

### What was built

Rationale and rejected alternatives: **ADR-027**. Operational detail:
**[watch-later.md](./watch-later.md)**, updated throughout.

- `app/composables/useSavedVideos.ts` (+ spec) — the single seam every bookmark
  now goes through. Clips route to `watch_later`; **live sessions stay on the
  local store**, not as a preference but because `watch_later` is keyed at
  `clips.id` with a real FK and a stream has ended by the time "later" arrives.
  `savedListName(kind)` is what labels and `aria-label`s call the destination,
  so nothing promises the wrong list.
- `GET /api/watch-later/ids` + `selectWatchLaterIds` — saved ids and nothing
  else, so a grid of 24 cards costs one small request between them instead of
  60 joined rows. Deliberately uncapped; a cap would draw an older save's
  bookmark as hollow.
- `useWatchLaterIds` / `useWatchLaterToggle` in `app/composables/useWatchLater.ts`.
  The cache prefix now has two shapes (`'list'` and `'ids'`), and the optimistic
  patches target them separately — a `setQueriesData` over the bare prefix would
  hand the id array to a callback written for cards. Saving is now optimistic on
  `'ids'` (the bookmark has to fill at once) and invalidate-only on the lists.
- 14 call sites swapped from `useWatchlistStore()` to `useSavedVideos()`:
  home grid + following rail, clip/category/channel/live grids, live rail,
  search, mix, up-next, discovery featured, shorts rail, and the watch page.
- The ⋮ menu lost its duplicate save row. One entry, named for where it goes.

### Dropdown menu (`app/components/ui/dropdown-menu`)

The stock shadcn item styles `focus:bg-accent focus:text-accent-foreground`, on
the assumption that `--accent` is a neutral hover tint. In this design system
`--accent` is the **brand cyan**, so a hovered row went cyan-on-white; and
`HomeVideoCardMenu` had overridden just the background with `surface-2`, one
shade off `--popover`, which left white text on near-white. That override is
what the report was looking at.

- New `variants.ts` holds the shared row/panel classes — the four item
  components had four copies of a 400-character string. Highlight is now
  `surface-3`, and **nothing sets a highlight text colour**, so it can't go
  invisible again.
- Highlight keys off `[data-highlighted]` as well as `:focus`. Reka focuses the
  row it highlights *except* when focus already sits in an input
  (`Menu/MenuItemImpl` line 47), where a `:focus`-only rule shows nothing.
- Panels moved to the project's popover language (`rounded-xl`, the long low
  `--shadow-color` shadow) so consumers stop re-skinning them inline;
  `HomeVideoCardMenu` now passes `class="w-64"` and nothing else.

### Not verified (toolchain blocked this session — same as several before it)

`pnpm typecheck`, `pnpm test` and `pnpm lint` could not be run: the Bash tool's
safety classifier was unavailable for the whole session and refused every
command that needed it. The dev server could not be started for the same reason,
so **none of this has been exercised in a browser**. Everything below is owed:

1. `pnpm typecheck` — the widest risk is the 14 swapped call sites, where
   `isSaved(id, kind)` takes an argument the old store method didn't.
2. `pnpm test` — `app/composables/useSavedVideos.spec.ts` is new and has never
   run. It mocks `useWatchLaterToggle` via `vi.hoisted`.
3. `pnpm lint`.
4. **In a browser, signed in**: bookmark a clip from the home grid → it appears
   at `/watch-later`; the same card's bookmark is filled on `/search` and the
   channel page; the ⋮ hover is visible in **light** mode.
5. Live channels: `/live` bookmark still lands in `/watchlist`, label says
   "watchlist".

### Deliberate limits (don't file these as bugs)

- **Clips saved to localStorage before this change are not migrated.** They stay
  under `/watchlist`'s "Saved clips" but read as unsaved on cards. Migrating
  would mean a silent background write to the account from whatever the browser
  happens to hold. Pressing the bookmark saves them properly.
- `/watchlist` is still not in any nav. It's now a live-channels page, reachable
  from the Watchlist tab on the discovery feed. Whether it earns a sidebar row
  is a product call, not a bug.
- The watch page's Save button still reads "Save"/"Saved" rather than naming
  Watch later — `WatchActions` doesn't receive the target's kind, and threading
  it through `WatchLayout` for a label wasn't worth the prop.

---

## Music page session, 2026-08-13 (appended)

Built `/music` — it was a `ComingSoon` placeholder. Full write-up in
[music.md](./music.md), decision record in **ADR-028**.

### What was built

A browse surface over the `Music` slice of `clips`: a cinematic hero with an
ambient muted loop, an "up next" strip, and horizontal shelves whose cards
**play a muted ~9s preview of the real track on hover**.

- `shared/types/music.ts` — `MusicTrack` is an **alias of `Clip`**, not a new
  shape. There is no music table and no playlist model; this page is a *view*.
- `server/utils/music.ts` — `selectMusicPage()`: **one** query (landscape
  `Music` clips, newest first) re-ordered in memory into four shelves, each
  derived from a real column: recency, `views`, `duration_seconds`, and
  `follows.channel = clips.creator`. No invented editorial taxonomy. Derived
  shelves under 3 items are dropped; "New this week" is exempt.
- `server/api/music/index.get.ts` — reads **without** a session (signed out you
  get the page minus the follows shelf), like `/api/home/mixes`.
- `app/composables/useMusic.ts` — TanStack query, viewer id in the key so
  signing in/out moves the page instead of serving a stale follows shelf.
- `app/composables/useHoverPreview.ts` + `app/utils/preview.ts` — the preview
  state machine: 450ms intent delay before anything loads, **one preview
  page-wide** (module-level token), always muted, fine-pointer only, reduced
  motion opts out entirely, elements unmounted rather than paused.
- `app/composables/useAmbientVideo.ts` — the hero loop. Pauses off-screen and
  on a backgrounded tab. **Client-only render** (`hydrated`), because SSR
  can't know `prefers-reduced-motion` and would mismatch on the page's largest
  element.
- `app/components/music/` — `MusicView` (loading/error/empty/loaded),
  `MusicHero`, `MusicShelf` (wraps the existing `HomeRail`), `MusicCard`,
  `NowPlayingBars`, `MusicSkeleton`.
- `main.css` — one new `equalize` keyframe + `--animate-equalize`, following
  the file's existing convention.
- `scripts/seed-clips.mjs` — **5 new Music clips**, on progressive mp4 sources
  already curl-verified at the top of that file. Two Music clips wasn't enough
  to fill the derived shelves (min 3), and the existing pair includes an HLS
  source that can't preview outside Safari.

### The HLS caveat (don't "fix" this without reading ADR-028)

A bare `<video>` plays HLS **only where the browser supports it natively**
(Safari yes, Chrome/Firefox no), and there's no standalone `hls.js` here.
`canPreviewSource()` therefore declines `.m3u8` off Safari and those cards keep
their still. **That is the design**, not a bug — pulling a media-source loader
or a Vidstack instance into a hover affordance was explicitly rejected.

### ⚠️ Verification status — READ BEFORE TRUSTING ANY OF THE ABOVE

**Same failure mode this doc already records twice**: the shell tool's safety
classifier was down for effectively this entire session. Read-only commands
(`cat`/`grep`/`sed`/`ls`) worked; **anything that executes did not**. So:

1. **`npm run typecheck` — NOT RUN.** Attempted ~8 times, blocked every time.
2. **`npm run lint` — NOT RUN.**
3. **`npm run test` — NOT RUN.** Two new spec files
   (`app/utils/preview.spec.ts`, `app/components/music/MusicCard.spec.ts`)
   have never been executed.
4. **`npm run db:seed:clips` — NOT RUN.** The 5 new Music rows are **not in
   the database yet**. Until this runs, `/music` will render a hero plus a
   single 2-item "New this week" rail, and the hero will be the HLS clip
   (static still in Chrome — see above). Run this first; it's `on conflict do
   update`, so it's safe to re-run.
5. **The page has never been rendered in a browser.** No screenshot, no
   console check, no responsive pass, no dark/light pass. The hover preview —
   the entire point of the feature — has never actually been seen to fire.

Do this before anything else:

```bash
npm run db:seed:clips && npm run typecheck && npm run lint && npm run test
```

then open `/music` and hover a card. Specifically worth eyeballing, because
none of it has been:
- Does the crossfade land on a playing frame, or a black one? (`showVideo` is
  deliberately later than `mounted` to prevent the latter.)
- Does sweeping fast across a rail start anything? (It shouldn't — 450ms.)
- Does a second card stop the first? (Module-level token.)
- 375×812: no horizontal overflow, no preview firing on tap.
- `prefers-reduced-motion: reduce`: no hero loop, no card previews, page still
  fully readable.

Treat the whole page as review-ready work, not as done.

### Appended same session: Up next search + filter

A second, smaller ask on top of the Watch later work above — "more features on
the watch page, like search filter". Scoped with the user to: a search box and
All/Live/Clips chips over the **Up next** rail, filtering client-side over the
twelve items already loaded. Documented under "Filtering Up next" in
[watch-page.md](./watch-page.md).

- `app/utils/upNext.ts` (+ spec) — `filterUpNext` (pure) and
  `upNextHasBothKinds`. Terms are AND-ed across title and channel, so "nova
  ranked" finds nova's "Ranked ladder push"; `meta` is deliberately excluded
  from the haystack because it's a formatted "12.4k views · 3 days ago" and
  searching it makes "3" match everything published this week.
- `app/components/watch/WatchUpNextFilters.vue` — control surface only, no list.
  `aria-pressed` toggles in a `role="group"`, *not* `HomeChipBar`'s
  `role="tablist"`: those chips swap panels and name them with `aria-controls`,
  these narrow a list that's already rendered. An `sr-only role="status"`
  speaks "Showing 3 of 12 videos".
- `WatchUpNext.vue` — owns `query`/`kind`, derives `visible`, and gained a
  distinct "nothing matches" empty state with a Clear button (separate from the
  existing "nothing else in this category").
- The control row hides below five items (`FILTERABLE_FROM`), and the kind chips
  hide unless the rail holds both kinds — the category rail is usually all
  clips, where a Live chip can only empty the list.
- The filter resets when the *video* changes, keyed on item ids rather than on
  the array, so walking to the next watch page clears it but a background
  refetch of the same twelve doesn't wipe mid-sentence typing.
- `__fixtures__/watch.ts` grew two clips (4 → 6) so `/zz-watch-preview` renders
  the controls at all, and so a channel search returns more than one card.

**Same verification gap as everything above** — `pnpm typecheck`, `pnpm test`,
`pnpm lint` and the dev server were all unavailable this session. `upNext.spec.ts`
is new and has never run. Fastest way to eyeball this without a seeded DB is
`/zz-watch-preview`.

---

## Watch-page AI assistant session, 2026-08-13 (appended)

Added a Gemini-backed assistant to `/watch/[slug]`, and reworked the page's
grid so a big monitor or a TV has somewhere to put it. Full write-up:
[ai-assistant.md](./ai-assistant.md). Decisions: ADR-029.

### ⚠️ Concurrent session note — read this

This session ran **alongside** another one working on `/music` and on clip
visibility. Partway through, that session committed
`a04b6c6 "feat: ai and music page"`, which swept up this session's
then-uncommitted AI files together with its own work. Nothing was lost or
overwritten — `selectRelated` (extracted here from `related.get.ts`) came back
with that session's `publishedClips` predicate correctly merged into it, and
`resolveWatchTarget` gained an optional `viewerId` that the AI routes
deliberately don't pass, so they get the stricter "no private clips" behaviour
by default.

Two things to be aware of:

- The visibility work's code comments reference **ADR-028** for clip
  visibility, but ADR-028 in `DECISIONS.md` is the `/music` hover-preview
  entry. That session owes an ADR; this one took **ADR-029**, the next free
  number at the time of writing. Check before claiming a number.
- `docs/ai-assistant.md`, the ADR and this entry were written after that
  commit, so they are not in it.

### What was built

**Server**

- `server/utils/gemini.ts` — REST transport for `generateContent`. Free-tier
  `gemini-3.5-flash` default, `GEMINI_MODEL` override for a paid model,
  `modelTier()` treating unrecognised ids as paid. 20s timeout, upstream errors
  mapped to stable status codes (429 → 429, timeout → 504, everything else →
  502). Two entry points: `generateText` and `generateJson` (Zod-validated).
- `server/utils/watch-ai.ts` — all prompt construction and the grounding
  guard, kept pure so it's testable with no API key.
- `server/utils/rate-limit.ts` — in-memory sliding window. Per-instance on
  purpose; see the ADR.
- `GET /api/ai/config`, `GET /api/watch/[slug]/ai/insights` (cached 6h),
  `POST /api/watch/[slug]/ai/ask` (auth required), `GET
  /api/watch/[slug]/ai/picks` (choice cached 2h, rows re-joined per request).
- `selectRelated()` moved into `server/utils/watch.ts` so the rail and the AI
  picks rank the same candidate set.

**Client**

- `app/composables/useWatchAi.ts` and `app/components/watch/ai/*` (panel,
  insights, ask, turn, prompts, picks). Self-fetching, like
  `WatchPlaylistQueue`. The playhead is passed as a getter, not a prop —
  Vidstack fires `time-update` several times a second and it's read once.
- `WatchUpNextCard` gained a `note` slot so the picks list reuses it instead of
  forking a near-identical card.

**Layout**

- `WatchLayout` goes to three columns at `3xl` (1920px): player+metadata,
  assistant, sidebar. `WatchView`'s cap steps 1560 → 2160 (`3xl`) → 2480
  (`4xl`). Theater mode still works at every breakpoint. Below `lg` the
  assistant falls after the sidebar in source order so live chat stays directly
  under the video on a phone.

### Verified this session (toolchain actually ran)

- `pnpm lint` — clean (only the 10 pre-existing `vue/require-default-prop`
  warnings in vendored `components/ui/*`).
- `pnpm typecheck` — no new errors. The repo has a standing set of pre-existing
  ones (`server/api/media`, `billing-plugin.ts`, `nuxt.config.ts`, the
  `useTemplateRef`-vs-`ref` union blowups in `motion/*`, `AppSearch`,
  `WatchChat`); nothing was added to it.
- `pnpm vitest run server/utils/watch-ai.spec.ts server/utils/rate-limit.spec.ts`
  — 23 passing.
- In a real browser at `localhost:3000/watch/clip-rendering?t=23`: all watch
  APIs 200 including `related` after the `selectRelated` refactor; `/api/ai/config`
  returns `{"enabled":false,...}` with no key set; three-column layout confirmed
  at 1920×1080 and 2560×1300; no horizontal overflow at 375×812.

### ⚠️ Not verified — the live model path

**No `GEMINI_API_KEY` was set in `.env` when this session ran**, so the disabled
path is proven end to end and the *enabled* one is not. Nothing has ever called
Gemini from this codebase. Before trusting the panel:

1. Add `GEMINI_API_KEY=...` to `.env` (get one at aistudio.google.com).
2. Reload a watch page. `/api/ai/config` should report `enabled: true`.
3. Check the summary and topics render, sign in, ask a question, and confirm
   the picks list appears above "Up next" with a reason per row.

Specifically unproven: whether the free flash model honours `responseSchema`
tightly enough that `generateJson`'s Zod check never trips (a 502 "unexpected
shape" in the panel is the symptom), and whether `maxOutputTokens` is generous
enough for the insights JSON.

### Owed / next steps

- E2E coverage (`e2e/watch-ai.spec.ts`) with the Gemini call stubbed — the unit
  tests cover the pure parts, but nothing exercises the endpoints.
- `.env.example` needs `GEMINI_API_KEY` and `GEMINI_MODEL` added. This session's
  tooling was denied read/write on `.env*` and could not do it.
- Move the rate limiter onto Redis when Phase 8 wires a client up.
- Real video understanding (Files API upload) belongs with Cloudflare Stream in
  Phase 6/7, not before — see the ADR for why the current grounding is
  structural rather than cautious.
