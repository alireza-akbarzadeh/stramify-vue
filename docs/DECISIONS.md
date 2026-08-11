# Architecture Decision Record

Format: one entry per decision — context, decision, alternatives rejected
(and why), consequences. New decisions get appended, never rewritten in
place; if a decision is reversed, add a new entry that supersedes it.

---

## ADR-001: Nuxt 4 + Vue 3.5 as the application framework

**Context**: Greenfield project, needs SSR for SEO on discovery/channel
pages, file routing, and a unified frontend+API deployable for a modular
monolith.

**Decision**: Nuxt 4 (current stable), Vue 3.5 (stable). Vue 3.6 Vapor mode
considered and deferred.

**Rejected**: Plain Vite+Vue SPA (loses SSR, would need a separate router
and API layer built by hand). Next.js/React (prompt explicitly specifies
Vue ecosystem). Vue 3.6 Vapor as the default (too new — component library
and devtools compatibility not yet proven across the stack we're adopting).

**Consequences**: Get SSR, file routing, Nitro server engine, and
auto-imports for free; tied to Nuxt's upgrade cadence (Nuxt 3 EOL 2026-07-31
is not our concern since we start on 4).

---

## ADR-002: shadcn-vue over Nuxt UI for the component layer

**Context**: The product has a lot of bespoke UI (live chat panel, theater
mode, stream dashboards, moderation tools) that no off-the-shelf kit ships
pre-built, regardless of vendor.

**Decision**: shadcn-vue (Reka UI primitives + Tailwind, code copied into
the repo and owned directly).

**Rejected**: Nuxt UI v4 — excellent first-party integration and 120+
components, but the "batteries included" value matters less when most of
the UI is custom anyway, and owning the component source (shadcn-vue's
model) makes it easier for both us and an AI agent to modify component
internals precisely (animation timing, focus behavior, DOM structure) rather
than fighting a library's abstraction layer.

**Consequences**: More setup work per component (copy-in rather than
`npm install`), but full control; no external breaking-change risk from a
UI-kit major version bump.

---

## ADR-003: Nitro server routes as a modular monolith (no separate API service)

**Context**: Prompt requires investigating dedicated API service vs Nitro
routes vs hybrid, and explicitly warns against premature microservices.

**Decision**: Nitro server routes under `server/api/<domain>/`, one
deployable artifact.

**Rejected**: Separate API service — no justification exists yet (no
polyglot requirement, no independent scaling need, one-person/agent team).

**Consequences**: Simpler deployment and local dev; domain folders are
structured so a domain (e.g. chat, video processing) could be extracted into
its own service later if load profiles diverge, without an app rewrite.

---

## ADR-004: Drizzle ORM over Prisma

**Context**: ~30-table schema, need for cold-start-friendly queries if we
ever deploy edge/serverless, and a team that wants SQL it can read directly.

**Decision**: Drizzle ORM + drizzle-kit migrations, PostgreSQL.

**Rejected**: Prisma — faster to sketch a schema initially and has more
mature tooling for very early prototyping, but its query engine adds
meaningful cold-start latency and it abstracts SQL more heavily, which
matters more as the schema and query complexity grow. Drizzle's code-first,
close-to-SQL approach was judged better for a schema this size that will be
maintained largely by an AI agent working directly in SQL-shaped code.

**Consequences**: More explicit schema code (no single Prisma schema file),
migrations generated and reviewed via drizzle-kit.

---

## ADR-005: Cloudflare Stream over Mux for video infrastructure

**Context**: Need managed live + VOD infrastructure; must not build custom
transcoding.

**Decision**: Cloudflare Stream for both VOD and live (RTMPS ingest at
launch, WHIP/WHEP as a fast-follow for sub-second latency).

**Rejected**: Mux — deeper analytics (Mux Data) and full DRM support, both
genuinely better than Cloudflare's offering, but at materially higher cost
at scale and without Cloudflare's native WHIP+WHEP pairing. Self-hosted
transcoding (ffmpeg/OME) — explicitly ruled out by the prompt's
"do not build custom transcoding infrastructure" instruction; would also
consume the majority of the project's engineering effort on infra rather
than product.

**Consequences**: Video provider details (upload API, playback IDs, signed
URLs) get an abstraction layer in `server/services/video/` so the provider
can be swapped for Mux later if DRM/analytics needs grow, without touching
route handlers or components.

---

## ADR-006: Nitro WebSockets + Redis pub/sub for realtime (chat, viewer counts)

**Context**: Live chat and notifications need realtime delivery; must scale
beyond a single server process eventually.

**Decision**: Nitro's built-in WebSocket routes (crossws) for the transport,
Redis pub/sub for cross-instance fan-out.

**Rejected**: A separate managed realtime service (Pusher/Ably/PartyKit) —
adds a recurring cost and a second realtime system to reason about, when
Nitro already ships WebSocket support natively. SSE — one-directional, chat
needs bidirectional (client sends messages, server broadcasts), so
WebSockets are the correct primitive, not SSE.

**Consequences**: Redis becomes a required piece of infrastructure (also
used for rate limiting and session/cache needs), but the WS layer itself
needs no separate hosting.

---

## ADR-007: better-auth over nuxt-auth-utils

**Context**: Platform needs RBAC (viewer/creator/moderator/admin) with
server-revocable sessions (e.g., a ban must take effect immediately).

**Decision**: better-auth with database-backed sessions against the primary
Postgres instance.

**Rejected**: nuxt-auth-utils — simpler, first-party, cookie-only sessions
with no external dependency, genuinely the better choice for a project that
doesn't need revocable sessions or complex roles. This project does: an
admin banning a user or revoking creator status must take effect without
waiting for a signed cookie to expire, which requires a server-side session
record — nuxt-auth-utils' sealed-cookie model doesn't provide that without
bolting on the same database-backed revocation list better-auth already
gives natively.

**Consequences**: One more service dependency (auth reads/writes the same
Postgres DB — no new infra), but correct RBAC/revocation semantics from day
one.

---

## ADR-008: Postgres full-text search before a dedicated search service

**Context**: Prompt explicitly instructs starting with Postgres search and
introducing dedicated search infra only when justified.

**Decision**: `tsvector`/`tsquery` generated columns + `pg_trgm` for fuzzy
matching on video titles, descriptions, tags, channel names.

**Rejected**: Meilisearch/Typesense/Elasticsearch at launch — real
typo-tolerance and relevance-ranking advantages, but no catalog exists yet
to search; standing up a second data store before there's data or query-
volume pressure is the over-engineering the prompt warns against.

**Consequences**: API contract for search (`/api/search?q=`) is written so
the implementation behind it can be swapped for a dedicated engine later
without changing callers.

---

## ADR-009: Install the third-party `ui-ux-pro-max-skill` CLI (supersedes earlier draft)

**Context**: The master prompt explicitly requires investigating and using
`ui-ux-pro-max-skill` (nextlevelbuilder), including installing it if not
present. Research (via the GitHub API directly, not marketing copy) confirmed
it's a real, actively maintained project: MIT license, ~113k GitHub stars,
~12k forks, published npm package `ui-ux-pro-max-cli` (small, 4 runtime
deps — `chalk`/`commander`/`ora`/`prompts`, no undisclosed Python
dependency despite some third-party summaries claiming otherwise) — not a
scam link — offering a searchable local database (styles, palettes, font
pairings, UX guidelines, per-stack reasoning including dedicated `vue.csv`
and `nuxt-ui.csv` files) for AI coding agents.

An earlier draft of this ADR recommended skipping the install as an
unnecessary supply-chain exposure and flagged the call to the user. The
user was asked directly (installing untrusted third-party code — global
npm package or Claude plugin marketplace — is a security-relevant action
that shouldn't be decided unilaterally) and chose to proceed with the CLI
install.

**Decision**: Installed via `npm install -g ui-ux-pro-max-cli` then
`uipro init --ai claude` in the project root. This populated
`.claude/skills/` with `ui-ux-pro-max` plus a related family of design
skills (`design-system`, `brand`, `design`, `ui-styling`, `banner-design`,
`slides`, `claude-automation-recommender`). These will be used during
Phase 2 (Design System) and ongoing UI work.

**Rejected**: Installing via the Claude plugin marketplace path
(`/plugin marketplace add ...`) — the CLI path grants less ambient trust
(a global npm package vs. a marketplace-registered plugin with broader
tool-access conventions) for the same end result. Skipping the tool
entirely — rejected once the trust concern was resolved by explicit user
sign-off; the prompt itself instructs using this tool, and its curated
per-stack (Vue/Nuxt UI) reference data has real value for Phase 2.

**Consequences**: Design system work in Phase 2 should actually invoke the
`ui-ux-pro-max` skill (and the sibling `design-system`/`ui-styling` skills)
rather than reinventing palette/type-pairing research by hand, since the
whole point of installing it was to use it.

---

## ADR-010: Modular monolith, no premature service split

**Context**: Prompt explicitly warns against 30 microservices, Kubernetes,
Kafka, event sourcing, GraphQL, multiple databases.

**Decision**: One Nuxt/Nitro app, one Postgres database, one Redis instance.
Domain-oriented folder structure (`server/api/streams`,
`server/api/videos`, `server/api/chat`, `server/api/social`,
`server/api/admin`) so boundaries exist in code even though deployment is
unified.

**Rejected**: Any of the above technologies at launch — no current
requirement justifies the operational complexity they'd add.

**Consequences**: Revisit only when a concrete scaling bottleneck appears
(e.g., chat fan-out volume actually saturates a single Redis instance).

---

## ADR-011: motion-v for section/UI animation

**Context**: PROMPT.md §8 calls for "subtle motion" and "premium
micro-interactions" as part of the UI direction; the user asked directly for
a Framer-Motion-equivalent for reusable section animations (fade/slide-in on
scroll, staggered lists) rather than hand-rolled CSS transitions for
anything beyond simple hover/focus states.

**Decision**: `motion-v` — the official Vue port of Motion (the same team
and API as Framer Motion for React: `<motion.div>` components, `while-in-view`
props, `AnimatePresence`), wrapped into reusable components under
`app/components/motion/` (e.g. a `Reveal` wrapper) rather than using its
primitives ad hoc inline in every page.

**Rejected**: `@vueuse/motion` (`v-motion` directive) — also solid and
already in the same ecosystem as VueUse (already a dependency), but a
directive-based API is a worse fit for building named, reusable animation
*components* as the user asked for, and its preset/variant model is less
directly transferable from Framer Motion knowledge. Hand-rolled CSS
`@keyframes`/transitions — sufficient for simple hover/focus states
(already used throughout `AppHeader`/`AppFooter`) but not for scroll-triggered
reveals or staggered children without reimplementing an intersection-observer
layer by hand. GSAP — more powerful for complex timeline choreography, but
heavier and overkill for section-level reveals; revisit only if a specific
page (e.g. a marketing-heavy landing redesign) needs real timeline
choreography.

**Consequences**: One more runtime dependency. `motion-v` does not disable
animation for `prefers-reduced-motion` on its own, so the shared `Reveal`
wrapper (`app/components/motion/Reveal.vue`) checks it explicitly via
VueUse's `usePreferredReducedMotion` and skips the transition, per the
accessibility requirement in PROMPT.md §17 — any future animation component
must do the same rather than assuming the library handles it.

---

## ADR-012: Vidstack for clip playback; clips table replaces discovery fixtures

**Context**: The discovery feed (Phase 5) shipped with `/api/discovery/clips`
serving static fixture data and a player modal that only showed a static
thumbnail with a fake play icon — no actual video ever played, which
violates the "no fake functionality" rule in CLAUDE.md once a feature is
presented as usable rather than as a scaffolding placeholder. The user asked
to connect clips to a real API and wire up a genuine, free, full-featured
player, ahead of Cloudflare Stream (ADR-005) actually being configured
(`CLOUDFLARE_STREAM_API_TOKEN` is still unset in `.env`).

**Decision**: Two changes, scoped to clips only (live signals/streaming stay
on fixtures — that's Phase 7, unchanged):
1. Added a real `clips` table (`server/db/schema/clips.ts`, Drizzle +
   Postgres — same DB already used for auth) with a `videoUrl` column
   holding a directly playable source (mp4 or HLS). `/api/discovery/clips`
   (`server/api/discovery/clips.get.ts`) now queries it instead of
   importing fixture objects. `scripts/seed-clips.mjs` seeds it with
   curl-verified, freely-licensed public test videos (W3C's `media.w3.org`
   assets, MDN's CC0 video set, Mux's public HLS test streams) — real,
   playable content, clearly sourced as seed data rather than hand-waved
   fixtures, matching the pattern of swapping in Cloudflare Stream playback
   URLs later without changing the column shape or the API contract.
2. Installed `vidstack` (`vidstack@1.15.6`, MIT licensed, npm `next` tag —
   the `latest` tag is a stale 0.x beta and must not be reinstalled) as the
   player. Wired via `app/plugins/vidstack.client.ts` (side-effect element
   registration, client-only since it defines real custom elements),
   `nuxt.config.ts`'s `vue.compilerOptions.isCustomElement` (so Vue's
   compiler leaves `media-*` tags as native DOM elements), and its default
   theme CSS. `ClipPlayerModal.vue` renders `<media-player>` +
   `<media-provider>` + `<media-video-layout>` when `item.videoUrl` is set;
   falls back to the old static-thumbnail treatment for live items (which
   still have no playable source, Phase 7).

**Rejected**: `vue-plyr`/Plyr — solid and simpler, but no native HLS/DASH
handling or built-in quality menu; would need hls.js wired up by hand
either way. Video.js — mature but jQuery-era API and heavier default
bundle for a Vue app. Hand-rolled `<video>` — fine for a single mp4 but
doesn't scale to HLS adaptive streaming, which Cloudflare Stream delivers,
so it'd need replacing later anyway. Google's `gtv-videos-bucket` sample
set (the most commonly copy-pasted "free test video" source in tutorials)
was tried first for seed data and rejected — it now 403s on every file
(verified via `curl -I`), so don't reintroduce it without re-checking live.

**Consequences**: `npm run db:seed` must be re-run after
`npm run db:migrate` on any fresh database (documented in
`scripts/seed-clips.mjs`'s header comment). When Cloudflare Stream
credentials land (ADR-005, Phase 7), swap `videoUrl` values for Stream
HLS manifest URLs — no schema or component change needed, since the
player already treats its source as an opaque playable URL. A
`shared/types/vidstack.d.ts` ambient import (`import 'vidstack/vue'`) is
required for `media-player`/`media-provider`/`media-video-layout` to
type-check in `.vue` templates — vidstack ships this augmentation itself,
it just isn't picked up automatically without an import somewhere in the
TS program.

---

## ADR-013: Real `live_streams` table backs `/live`; `LiveSignal` extended

**Context**: `/live` was a `ComingSoon` placeholder and the "Live Signals"
rail on `/clips` was served from `server/utils/fixtures/discovery.ts` — a
hard-coded array shaped like the eventual response. That was acceptable
while nothing presented live channels as usable, but a real "who's live
now" directory page cannot ship on fixtures without violating CLAUDE.md's
"no fake functionality / never fake realtime or streaming behavior" rule
(§20 point 2) — the same gap ADR-012 closed for clips. The real ingest
path (RTMPS → Cloudflare Stream, ADR-005) is Phase 7 and still unbuilt
(`CLOUDFLARE_STREAM_API_TOKEN` remains empty in `.env`), so the choice was
between shipping the directory on fixtures or on a real table with real
playable sources.

**Decision**: Follow the ADR-012 precedent exactly, scoped to the live
directory only (`/following` and `/category`'s ComingSoon status, per-channel
`/live/[username]` pages, and live chat are all untouched):

1. Added a real `live_streams` table (`server/db/schema/live-streams.ts`) —
   `streamerName`, `title`, `category` (**reusing** `clipCategoryEnum` from
   `clips.ts` rather than declaring a second identical Postgres enum type),
   `videoUrl`, `thumbnailUrl`, `viewerCount`, `startedAt` (when the session
   went live — drives the uptime display), `createdAt`. Migration
   `0002_noisy_lady_deathstrike.sql`, applied to the Neon database.
2. `scripts/seed-live-streams.mjs` (npm script `db:seed:live`; `db:seed` now
   runs clips + live) seeds 8 channels across the three categories with
   curl-verified, freely-licensed sources — Mux's public HLS test streams
   (`test-streams.mux.dev`, `stream.mux.com`), W3C's `media.w3.org` assets,
   and MDN's CC0 set. HLS is preferred here because Cloudflare Stream live
   playback delivers HLS manifests, so the swap later is a data change only.
   Google's `gtv-videos-bucket` set stays banned (403s, see ADR-012).
3. `server/api/discovery/live.get.ts` now queries the table via Drizzle
   ordered by `viewerCount desc` (busiest channels first) and maps rows
   through `toLiveSignal` in `server/utils/discovery.ts`, next to the
   `toClip` mapper. `server/utils/fixtures/discovery.ts` was deleted (the
   whole `fixtures/` directory is gone — nothing else imported it).
4. `LiveSignal` (`shared/types/discovery.ts`) grew `title`, `category`,
   `uptime`, and `videoUrl` alongside the existing `id`/`name`/`viewers`/
   `image`. Purely additive, so `LiveSignalsRail.vue` on `/clips` kept
   working unchanged and now renders real rows. A new `formatUptime`
   (`server/utils/format.ts`) renders `startedAt` as `"9m"` / `"3h 17m"` —
   deliberately not `formatAge`'s `"3h ago"`, since uptime is a duration,
   not an age, and stays minute-precise past the hour.
5. `WatchlistItem.videoUrl` is still optional, but live items now always
   carry one, so the player modal's "no source" fallback copy changed from
   "Live streaming coming soon" (now false) to "Playback source
   unavailable" — it only ever shows for watchlist entries saved to
   localStorage before this change.

**Rejected**: Keeping `/live` on `ComingSoon` until Phase 7 — leaves a
whole nav entry dead while the data model needed for it is trivial and
already precedented. A separate `live_category` Postgres enum — duplicate
type for identical values; the categories are one product concept, and
`shared/utils/category.ts` already treats `CLIP_CATEGORIES` as the single
source of truth for both sides of the wire. A dedicated `LivePlayerModal`
— `ClipPlayerModal` already takes a `WatchlistItem` with an opaque
`videoUrl`, so live channels reuse it as-is. Faking a ticking viewer count
client-side — that's exactly the "fake realtime" the rules forbid; real
viewer counts arrive with the WebSocket/Redis work (ADR-006).

**Consequences**: `npm run db:seed` must be re-run after `db:migrate` on a
fresh database to get live channels as well as clips. Viewer counts and
`startedAt` are static seed values until Phase 7 wires real ingest and the
realtime counter — uptime therefore grows monotonically from the seed time
(re-run `npm run db:seed:live` to reset it to fresh-looking values). When
Cloudflare Stream lands, point `live_streams.video_url` at live-playback
HLS manifests and drive `viewer_count` from the realtime layer; no schema,
API-contract, or component change is needed. `/live/[username]` channel
pages and live chat remain unbuilt on purpose.

## ADR-014: One `/watch/[slug]` page for clips and live; `/live/[username]` superseded

**Context**: Clips had no URL at all — they played in `ClipPlayerModal`, an
overlay opened from the discovery grid, so a clip could not be linked,
shared, or deep-linked. Live channels had `/live/[username]`
(`LiveChannelView.vue`), which was a player, one metadata row, a save
button, and four "more live now" cards. Neither surface had comments,
chat, likes, follows, or a recommendation rail. The product needs a real
destination page — the thing every competitor calls a watch page.

The open question was whether that is one page or two. Clips and live
sessions differ in exactly four ways: a view count vs a concurrent viewer
count, a publish date vs an uptime, a duration vs none, and comments vs
chat. Everything else — player, title, channel bar, follow, like, share,
save, description, up-next rail — is identical.

**Decision**: One page, `/watch/[slug]`, serving both.

1. `WatchTarget` (`shared/types/watch.ts`) is a union discriminated on
   `kind: 'clip' | 'live'`, so the page branches once at the top instead of
   null-checking live-only fields everywhere.
2. **Slug resolution** (`server/utils/watch.ts`, `resolveWatchTarget`):
   match `clips.id` exactly, then `live_streams.streamer_name`
   case-insensitively. The namespaces cannot collide by construction — clip
   ids are prefixed slugs (`clip-midnight-echo`), live slugs are streamer
   handles (`Viper_Squadron`) — so no `c/` `l/` prefix scheme is needed. A
   miss is a 404, which the page renders as a real "we couldn't find that
   video" state.
3. `/live/[username]` becomes a `definePageMeta` redirect to
   `/watch/[username]` rather than being deleted: a channel's handle *is*
   its watch slug, so existing links, bookmarks, and `e2e/live.spec.ts`
   keep working. `LiveChannelView.vue` and `ClipPlayerModal.vue` lost all
   call sites and were deleted.
4. Four new tables (migration `0003_*`): `comments`, `chat_messages`
   (ADR-015), `reactions`, `follows`. Plus a nullable `description` column
   on `clips` and `live_streams` — nullable because rows already existed
   and creator uploads won't always carry one; the UI says "No description
   provided" rather than rendering an empty block.
5. **Comments are read-only** in this release (seeded via
   `scripts/seed-comments.mjs`, served by `GET /api/watch/[slug]/comments`,
   one level of replies, Top/Newest sort). The UI states this in plain
   words instead of showing a disabled composer that implies posting works.
   `comments.user_id` is nullable *alongside* a non-null `author_name`, so
   enabling posting later is an endpoint, not a migration.
6. `reactions` uses one table with `target_id` + `target_kind` rather than
   two near-identical tables or two nullable FKs. Cost: no referential
   integrity on `target_id`. Benefit: one toggle endpoint, one query path.
   The unique `(user_id, target_id)` constraint is what makes the toggle
   safe — switching like → dislike is an upsert, so a fast double-click
   cannot leave a user holding both.
7. `follows.channel` is a **text handle, not a foreign key**, because there
   is no `channels` table — `clips.creator` and `live_streams.streamer_name`
   are the only channel identity in the schema, and both are free text.
   Channel summaries (`server/utils/channels.ts`) are derived at query time,
   the same pattern ADR-012 established for categories.
8. `POST /api/watch/[slug]/view` increments `clips.views`, debounced to once
   per slug per browser session in `useViewCounter`. It is a deliberate
   **no-op for live**: `live_streams.viewer_count` is concurrent viewers,
   not cumulative views, and a counter that only goes up would misrepresent
   how many people are actually watching. Real concurrency is Phase 7.
9. `formatCount` moved from `server/utils/format.ts` to
   `shared/utils/format.ts` (the server file re-exports it, so no import
   changed) because the like button re-formats counts client-side after an
   optimistic update, and two implementations would have drifted.

**Rejected**: Two separate pages — would have duplicated the player,
channel bar, actions, description, and rail, then drifted. Prefixed slugs
(`/watch/c/<id>`, `/watch/l/<handle>`) — solves a collision that cannot
happen and makes every link uglier. A `channels` table in this change —
real, but it needs creator accounts and ownership rules that belong to
Phase 9; deriving from the handle ships the follow button now and converts
to an FK in one migration later. Keeping `ClipPlayerModal` as a
quick-preview affordance — two ways to watch the same clip, one of which
has no URL.

**Consequences**: `npm run db:migrate && npm run db:seed` is required after
pulling this. Renaming a channel orphans its follower rows until a
`channels` table exists. Recommendations in the up-next rail are
category-only — there is no watch history or recommender, and inventing a
relevance score off nothing would have been theatre. Every discovery
surface (`DiscoveryFeed`, `CategoryDetail`, `LiveDirectory`,
`LiveSignalsRail`, `WatchlistPanel`) now navigates to `/watch/…`.

## ADR-015: Live chat ships over REST + polling, not WebSockets (Phase 8 precursor)

**Context**: A live watch page without chat is not a live watch page. But
the realtime stack chosen in ADR-006 — Nitro crossws + Redis pub/sub — is
Phase 8, needs a running Redis, and needs a deployment target that holds a
long-lived Node process (still an open question in PROGRESS.md). Building
it now would pull an entire unbuilt phase into a page-level feature.

The tempting shortcut — render a chat panel filled with scripted messages
on a timer — is exactly the "never fake realtime/streaming behavior" rule
in CLAUDE.md §20 point 2.

**Decision**: Ship chat as genuinely real, just not yet realtime.

1. A real `chat_messages` table. `POST /api/watch/[slug]/chat` requires a
   session (`requireUser`, 401 otherwise), validates the body with Zod
   (1–200 chars), and inserts. Messages persist and survive reload.
2. `GET /api/watch/[slug]/chat` takes `?since=<iso>` so a poll returns only
   newer rows; `mergeChatMessages` (`app/utils/chat.ts`) dedupes by id and
   re-sorts, which is also what reconciles an optimistic local message with
   the same message coming back from the server.
3. `useWatchChat` polls every 5s **only while the tab is visible**
   (`useDocumentVisibility`) — nobody reads a background tab, and an idle
   stream page should not hammer the database all afternoon.
4. Seeded backlog (`scripts/seed-chat.mjs`) has `user_id: null` and renders
   identically to a real message. Chat is real; it just starts with history.

The swap path is deliberately narrow: Phase 8 keeps the insert in
`chat.post.ts` and adds a Redis publish, and `useWatchChat` trades its
`refetchInterval` for a crossws subscription. Subscribers receive the same
`ChatMessage` shape, so `WatchChat.vue` is untouched.

**Rejected**: Building crossws + Redis now — drags all of Phase 8 into this
task and needs infrastructure decisions that aren't made. Server-Sent
Events as a halfway house — a second transport to write and then throw
away when WebSockets land, since chat needs a client→server channel
anyway. Scripted/simulated messages — forbidden, and worse than an empty
panel. Read-only chat — chat without sending is just a comment list.

**Consequences**: Messages appear up to 5s late; this is visible and
accepted. Polling cost scales with concurrent viewers on a live page,
which is fine at seed scale and is precisely what Phase 8 fixes. The
5s interval and the 200-message client buffer (`CHAT_BUFFER_LIMIT`) are
the two knobs if that changes before Phase 8 lands. Unlike comments (which
are read-only per ADR-014), chat accepts posts — the asymmetry is
deliberate: a live stream is worthless without a back-channel, a VOD is
not.

---

## ADR-016: Comments become writable; a custom player skin replaces Vidstack's default layout

**Status**: Accepted (2026-08-07). Supersedes the read-only-comments part of
ADR-014; the rest of ADR-014 stands.

**Context**: ADR-014 shipped `/watch/[slug]` with comments deliberately
read-only, on the reasoning that posting belonged with the creator-tools
release. In practice the watch page then carried a "comments are read-only
for now" banner above a list nobody could join, which reads as an unfinished
feature rather than a scoped one. The `comments` table was already shaped for
posting (nullable `user_id`, `parent_id` for one reply level), so the only
thing standing between the page and a working comment section was endpoints.

Two other things surfaced at the same time and are recorded here because
they were fixed together:

- **Seed coverage was uneven.** `seed-comments.mjs` covered four of the seven
  seeded clips. Opening `/watch/clip-rendering` — a clip with no comments and
  a one-line description — showed an empty comment list and a bare info box,
  which looked like a bug and wasn't.
- **The player wore Vidstack's stock skin.** `media-video-layout` is a
  perfectly good default that looks nothing like this app, to the point that
  it reads as an unstyled `<video>` element to anyone looking at the page.

**Decision**:

1. **Comments are writable.** Four endpoints under
   `server/api/watch/[slug]/comments`: `GET` (now session-aware), `POST`
   (create/reply), `DELETE /[id]` (own comments only), and
   `POST /[id]/like`. Every write goes through `requireUser` and re-checks
   ownership server-side; the UI's affordances are not the authorization.
2. **Likes are a new `comment_likes` table**, not a mutated counter.
   `comments.likes` stays as the seeded baseline and real like rows count on
   top of it, so seeded social proof survives and an app-written comment
   starts honestly at zero. A unique `(user_id, comment_id)` makes the toggle
   safe under a double-click, mirroring `reactions`.
3. **Replies stay one level deep.** Replying to a reply attaches to that
   reply's parent rather than 400-ing — it's what the viewer meant, and it
   keeps the reader's in-memory threading (no recursive CTE) correct.
4. **The player gets our own skin.** Vidstack's headless elements
   (`vidstack/player/ui`) under `app/components/watch/player/` plus
   `app/assets/css/player.css`. `default/theme.css` and
   `default/layouts/video.css` are no longer loaded, and
   `player/layouts/default` is no longer imported.
5. **Every seeded clip gets comments.** Covered by an e2e regression test
   that walks `/api/discovery/clips` rather than checking one hard-coded slug.

**Rejected**: *Counting likes by mutating `comments.likes`* — loses the
distinction between seeded baseline and real engagement, and makes an unlike
indistinguishable from a bad decrement. *Full comment editing* — considered
and deferred; it needs an `edited_at` column and an inline edit state, and
delete-and-repost covers the common case. *Arbitrary reply depth* — the UI
has nowhere to put level three and the reader would need a recursive CTE.
*Theming Vidstack's default layout with CSS variables* — cheaper, but locks
the control arrangement to Vidstack's choices. *Replacing Vidstack with a
hand-rolled `<video>` wrapper* — throws away HLS handling, keyboard
shortcuts, focus management and ARIA that already work.

**Consequences**: Comment moderation does not exist — anyone signed in can
post anything, and there is no report/hide/pin path. That is the next real
gap on this page and is deliberately out of scope here (Phase 11, Admin).
The custom skin means Vidstack layout upgrades no longer arrive for free;
the trade is that the player now matches the app. Captions render but no
seeded source ships caption tracks, so the button is present and inert until
one does — visible and honest rather than hidden.

---

## ADR-017: The dashboard reads real aggregations; channel ownership stays the handle

**Status**: Accepted (2026-08-07).

**Context**: `/dashboard` was a welcome banner plus a security checklist and a
roadmap card, and `/dashboard/analytics` was a `ComingSoon` placeholder. Both
rendered through `AppHeader`/`AppFooter` even though `DashboardShell.vue` and
`AppSidebar.vue` — a full sidebar shell — already existed unused in
`app/components/dashboard/`.

Making the dashboard real runs straight into a schema fact: **nothing links a
`user` to the content they publish.** `clips.creator` and
`live_streams.streamer_name` are free text and there is no `clips.user_id`.
A `channels` table *does* exist (added alongside the channel-pages work in the
same commit as this ADR), but it holds identity only — display name, avatar,
banner, tagline, bio, verified — keyed by `handle`, with **no owner column**
pointing back at `user`. So "your channel's numbers" still has no foreign key
to follow.

> **Correction, same day**: an earlier draft of this ADR said "there is no
> `channels` table". That was true when the dashboard work started and false
> by the time it landed — a concurrent session added one mid-flight, recorded
> in **ADR-018**, which deliberately keeps it identity-only and leaves the
> handle-matched ownership below untouched. The premise is corrected here
> rather than left to mislead the next reader; the decision is unaffected.

**Decision**: Build the dashboard on real aggregations only, and resolve
channel ownership the way the rest of the app already does — by handle.

1. **Ownership = `user.name` matched case-insensitively** against
   `clips.creator` / `live_streams.streamer_name`. This is not a new identity
   model; it is exactly what `readChannelSummary` (`server/utils/channels.ts`)
   and `/api/discovery/live/[streamer]` already do, and what `follows.channel`
   already stores. No migration.
2. **No channel means an empty state, not zeroes.** `CreatorOverview.exists`
   is false when a handle owns no clips and has no live session, and the UI
   says "nothing published under your handle yet". A grid reading "0 views,
   0 followers" would claim a channel exists and is doing badly.
3. **Only metrics the database can actually answer.** Followers, clips, views,
   likes received, comments received (creator side); following, reactions
   given, comments posted, chat sent (viewer side); live channels, viewers,
   clips, busiest category (platform). Time series come from real
   `created_at` columns on `follows`, `comments` and `reactions`.
4. **What isn't recorded isn't shown.** No watch time, retention, unique
   viewers, or view-over-time chart — `clips.views` is a single counter, not a
   session log. The analytics page says so in visible copy rather than
   omitting it silently or estimating it (CLAUDE.md §2).
5. **The handle comes from the session, never a query parameter.**
   `/api/dashboard/analytics` has no `?channel=`; with no `channels` table one
   would let any signed-in user read anyone else's numbers.

**Rejected**: *Adding a `channels` table or `clips.user_id` now* — the right
long-term fix and explicitly anticipated by ADR-014, but it is a migration
plus a backfill plus an ownership-claim flow, which is Phase 9 work, not a
prerequisite for reading numbers that already exist. *Seeding a demo channel
onto the signed-in user* — fake data in a production path. *Estimating watch
time from `duration_seconds × views`* — an invented metric that would look
authoritative. *A charting library* — two SVG paths do not justify a
dependency; `TrendChart.vue` is ~60 lines.

**Consequences**: A user whose display name doesn't match a seeded creator
sees the empty state on both pages — correct, but it means the populated
dashboard is only visible by signing in as (or renaming to) a seeded handle
such as `Viper_Squadron`. Renaming a channel still orphans its follows and now
also its dashboard, the same known cost ADR-014 recorded. Analytics windows
are capped at 90 days because `follows`/`reactions` only start when those
tables did.

## ADR-018: A `channels` table for identity only; every channel number stays derived

**Status**: Accepted (2026-08-07). Narrows the rejection recorded in ADR-017.

**Context**: The app needed a real channel page (`/channel/[handle]`) and a
ranked channel directory (`/channels`): the uploader's name on a watch page had
nowhere to click through to, and there was no way to browse channels at all —
only clips, categories and current live sessions.

A channel page shows two very different kinds of information. **Stats**
(followers, total views, video count, live-right-now) are aggregates the
database can already answer from `clips`, `live_streams` and `follows`.
**Identity** (display name, banner, avatar, tagline, About text, verification,
join date) is authored content that exists nowhere in the schema — a channel
was only ever a free-text handle on someone else's row (ADR-014).

ADR-017, earlier the same day, rejected adding a `channels` table *as a
prerequisite for the dashboard* and read numbers through the handle instead.
That reasoning holds for numbers. It does not answer where a banner lives.

**Decision**: Add a `channels` table that stores **only** authored identity, and
keep every countable thing derived.

1. **`handle` is the primary key, stored lowercase**, and is also the URL
   segment. `clips.creator`, `live_streams.streamer_name` and `follows.channel`
   are unchanged free text and join against it on `lower(...)` — the same
   case-insensitive match `readChannelSummary` and `/api/discovery/live/[streamer]`
   already used. **No foreign keys, no backfill, no ownership change**, so
   ADR-017's `user.name`-matched dashboard ownership keeps working untouched.
2. **No counters in the table.** Followers, views, clip count and live status are
   computed per request by one CTE in `server/utils/channels.ts`. There is no
   stored total that can drift from the rows it summarises.
3. **A channel without a row still works.** Identity falls back to the creator's
   own casing (`Viper_Squadron` → "Viper Squadron") and the gradient avatar, so
   a creator who has published but never written a bio has a working page.
4. **Ranking is written down, not tuned by feel.** `top` =
   `2·ln(1+followers) + ln(1+views) + 1.5 if live`. Both signals are logged so
   one runaway number can't own the ranking; followers weigh double because
   following is deliberate and a view is not. `followers`, `views`, `live` and
   `new` are plain single-key orders. All of it runs in SQL, so `limit` is a
   real limit rather than a slice of an already-fetched list.
5. **Follower counts cross the wire raw** (`followerCount: number`), unlike every
   other pre-formatted count. Following is the one number the client changes on
   its own, and `±1` on an integer can't drift the way re-parsing `"12.4k"`
   would. One `useFollowChannel` mutation patches all three cached shapes of a
   channel (watch-page summary, profile, directory row).

**Rejected**: *Deriving identity too* (banner = top clip's thumbnail, no bio) —
the About tab would have nothing in it and every channel would look like a
scrape of its own uploads. *Making `clips.creator` an FK now* — that is the
migration-plus-backfill-plus-ownership-claim work ADR-017 correctly deferred to
Phase 9; this table is additive and doesn't block it. *Storing follower/view
counters on the row* — a denormalisation with no measured need and a guaranteed
drift bug. *Ranking client-side* — makes `limit` meaningless and re-ranks on
every keystroke.

**Consequences**: Renaming a channel still orphans its follows, its dashboard
*and* now its identity row — the same known cost as ADR-014, no worse. Seeded
follower data comes from clearly-marked inert demo accounts
(`scripts/seed-follows.mjs`, ids prefixed `demo-follower-`, no `account` row so
none can sign in), because `follows.user_id` is a real FK and a follower cannot
exist without an account; without them "most followers" would be a column of
ties. Verification (`channels.verified`) is seed-set today — there is no
claim/review flow, and it deliberately buys no ranking.

---

## ADR-019: Pinia holds shared client state; server state stays in TanStack Query

**Status**: Accepted (2026-08-07). Narrows the "all state arrives as props"
contract set for `WatchLayout` in ADR-016.

**Context**: `pinia` and `@pinia/nuxt` were installed and the module was
registered in `nuxt.config.ts`, but the codebase contained zero `defineStore`
calls and no `app/stores/` directory. Shared client state had instead grown two
shapes, both of which leaked into component signatures:

1. **Viewer identity threaded through props.** `useAuth()` was a `useState`
   singleton that six components already called directly — but the comment tree
   did not. `WatchView` read the session, repacked it into a `CommentsPanel`, and
   `canPost` / `authorName` / `authorImage` then travelled five levels
   (`WatchView` → `WatchLayout` → `WatchComments` → `WatchCommentItem` →
   recursive `WatchCommentItem` → `WatchCommentComposer`) to render one avatar
   and one log-in prompt. `WatchLayout` re-emitted thirteen events it did not use.
2. **A predicate passed as a prop.** `useWatchlist()` was called in four
   components, each building its own `useLocalStorage` binding, and `isSaved`
   was additionally passed *as a function* into `WatchLayout`/`WatchUpNext` and
   `DiscoveryFeed`/`ClipGrid`/`LiveSignalsRail`. The four bindings did stay in
   sync (VueUse dispatches a `vueuse-storage` event for same-tab instances), so
   this was duplication rather than a bug: four serialise/parse pipelines and
   four listeners for one logical value.

**Decision**: Two stores in `app/stores/`, scoped strictly to **shared client
state**, and no change to how server state flows.

1. **`stores/auth.ts`** replaces `composables/useAuth.ts`. `plugins/auth-session.ts`
   fills it during SSR and `@pinia/nuxt` serialises it into the payload, so this
   is behaviourally equivalent to the `useState` it replaces — the win is that
   leaves read identity themselves instead of receiving it.
2. **`stores/watchlist.ts`** replaces `composables/useWatchlist.ts` and binds
   localStorage exactly once. `items` is wrapped in **`skipHydrate`**: it
   persists itself, so letting Pinia restore it from the SSR payload would write
   the server's empty `[]` over the real stored list before `initOnMounted`
   reads it. `hydrated` uses `tryOnMounted`, not `onMounted`, because a store is
   instantiated by whichever component asks first and may have no instance to
   bind to.
3. **TanStack Query keeps every server-state concern.** Comments, chat, related
   items and the watch target stay queries passed as props; the `AsyncPanel`
   view-models keep `items`/`pending`/`errored` plus the mutation flags
   (`posting`, `sending`). Nothing that has a cache in TanStack gets a second
   copy in Pinia.
4. **Grids own the save control.** `ClipGrid`, `LiveChannelGrid`,
   `LiveSignalsRail` and `WatchUpNext` read `isSaved` and call `toggle` on the
   store, which deletes the function prop and the `toggle-save-related` emit
   chain. Leaf cards keep a plain `saved: boolean` prop — one hop from a
   component that has the store, and it keeps them presentational and testable.
5. **The fixture preview seeds stores instead of passing props.**
   `zz-watch-preview.vue` assigns `useAuthStore().session` to preview the
   signed-in composer. This is why `WatchLayout` can lose the props without
   losing its fixture-driven preview.

**Rejected**: *Stores for everything, including query data* — duplicates
TanStack's cache and contradicts the client-state-only split; the panel props
exist so each section renders its own loading/error state. *Migrating the
dashboard* — `DashboardOverview` already fetches once and hands one level of
data to presentational panels, which is correct prop usage, not drilling.
*`provide`/`inject` for viewer identity* — solves the threading but gives no
devtools, no typed actions, and still needs a provider component above every
consumer. *Keeping `useAuth` as a wrapper over the store* — an indirection whose
only purpose is to avoid touching eight import lines. *Moving local UI refs*
(`range`, `search`, `activeCategory`, `sort`, `replying`) — single-component
state that nothing else reads.

**Consequences**: `WatchComments`, `WatchCommentItem`, `WatchCommentComposer`,
`WatchChat` and the four grids are no longer pure functions of their props —
they require an active Pinia instance, so any future spec must seed the store
(see `WatchChat.spec.ts`, which now calls a local `signIn()`/`signOut()` instead
of toggling a `canPost` prop). The player tree is untouched: Vidstack's custom
elements carry their own media context and `PlayerControls` takes one boolean.

## ADR-020: `/` becomes the app's home feed, ranked by an explicit score

**Status**: Accepted (2026-08-09). Moves the landing page written for ADR-001's
scope to `/marketing`.

**Context**: `/` was the marketing landing page — hero, pricing, FAQ, final CTA —
while every actual product surface lived one click away behind the dashboard
layout (`/live`, `/clips`, `/category`, `/channels`, `/watch/…`). That is the
right front door for a product with no content; it is the wrong one for a
platform whose whole value is the catalogue. Neither Twitch nor YouTube shows a
pitch at the root, and a returning viewer had no page that answered "what should
I watch now" — `/clips` is a flat reverse-chronological list of VODs only, and
`/live` is live only.

The signals to rank with already existed and were unused: `clips.views`,
`live_streams.viewer_count`, the `reactions` table (ADR-014) and the `follows`
table. What did **not** exist was any watch history — there are no per-viewer
view events, only a counter incremented by `view.post.ts`.

**Decision**: `/` renders `HomeView` under the dashboard layout: a category chip
bar, a subscriptions rail, and a ranked recommendation grid. The landing page
moves verbatim to `/marketing`, linked from the footer's Company column.

1. **One score, written down in `server/utils/home.ts`**, not tuned by feel:
   `ln(1+audience) + 1.5·ln(1+likes) − ln(1+dislikes) + 3·followed + 1.5·live +
   2/(1+age_days)`. Both popularity terms are logged first so one runaway number
   can't own the page — the same reasoning as `RANK_SCORE` in `channels.ts`. A
   like is weighted above a view because it's deliberate; the follow boost is
   sized (in log space) to roughly the gap between a 1k- and a 20k-view video,
   so a subscribed channel reliably outranks a comparable stranger without
   turning the feed into a subscriptions page.
2. **Clips and live sessions rank in one relation.** A `union all` CTE
   normalises them into `audience` / `published_at`, so ordering and `limit`
   happen in Postgres across both kinds. Merging two queries in JS would mean
   fetching the whole catalogue per page.
3. **Personalisation is optional, never required.** `/api/home/feed` reads the
   session with `getSessionUser` and falls back to pure popularity when there
   isn't one; a signed-out visitor gets a full page, not a login wall.
   `/api/home/following` returns `[]` rather than a 401 for the same reason.
4. **The subscriptions rail sorts by recency, not by score.** It answers "what's
   new from my channels"; a popular old upload pinned to its front would be the
   wrong answer. It's therefore a separate endpoint, and it only renders above
   the unfiltered feed — on a category chip it would be answering a different
   question than the grid under it.
5. **Recommendation reasons are honest or absent.** The server returns
   `'following' | 'live' | 'new' | null`; `null` (popularity alone) renders no
   line rather than dressing a view count up as a personal recommendation. The
   copy itself lives in `shared/utils/home.ts`, off the wire.
6. **Offset paging, not a keyset cursor.** The ranking is deterministic per
   viewer (ties break on id) and the catalogue is small; a keyset over a
   computed score would have to ship the score to the client, pinning the
   formula into the URL.

**Rejected**: *A `recommendations` table or a precomputed feed* — nothing to
precompute from, and it adds a staleness problem the query doesn't have.
*Collaborative filtering / "viewers also watched"* — there is no per-viewer
watch history in the schema, so it would be invented output (CLAUDE.md rule 2).
*Keeping the landing page at `/` and putting the feed at `/home`* — leaves the
root as the least useful page in the app and splits "home" across two URLs.
*Reusing `DiscoveryFeed` for `/`* — it's clip-only, has its own search box that
behaves differently from `AppSearch`, and its category tabs filter an
already-fetched array rather than the query. *A separate "Live now" rail on
home* — the +1.5 live boost already floats live sessions into the top of the
unfiltered grid, and the Live chip plus `/live` cover the rest; a rail would
have shown the same rows twice.

**Consequences**: `e2e/home.spec.ts` was rewritten for the feed and the old
landing assertions moved to `e2e/marketing.spec.ts`. The score is the one place
to change when real view events land (Phase 12) — until then "recommended"
means popularity + your follows + freshness, and `docs/home-feed.md` says so
plainly. `/clips` and `/live` keep their dedicated pages; home does not replace
them, it ranks across them.

---

## ADR-021: `/following` ships on the existing `follows` table; the story ring means "new this week", not "unseen"

**Status**: Accepted (2026-08-11). Retires the `ComingSoon` placeholder noted in
ADR-020's follow-ups and in PROGRESS.md.

**Context**: `follows` has existed since ADR-014 and is written from four
surfaces (watch page, channel page, `/channels`, and the home rail's cards). Its
only reader was the ranking term in `server/utils/home.ts` and the notification
feed. Nothing in the app ever answered "which channels do I follow" — `/following`
was a placeholder and was not linked from any nav, so the Follow button had no
payoff page at all.

Two things did **not** exist and still don't: any per-viewer watch history (only
`clips.views`, a counter), and any "seen" state for a channel's uploads.
`watch_progress` (migration `0007`) records resume positions for videos you
opened, which is not the same thing as knowing you've seen that a channel
published.

**Decision**: `/following` renders a story rail, a shelf per channel, and a
manage list, off two new read-only endpoints. No migration — every column it
reads already exists.

1. **The story ring has three states, and the lit ones are honest.** `live`
   (rotating accent gradient), `new` (the channel's own hue, held still) and
   `quiet` (a flat border). `new` means "published within
   `FOLLOWING_FRESH_DAYS`", and every label the UI attaches says exactly that —
   "new this week". An Instagram-style ring invites the reading "unseen", which
   the schema cannot support; claiming it would be fake functionality
   (CLAUDE.md rule 2). Live uses one fixed gradient for every channel rather
   than a per-channel hue, because it is the one state that has to mean the
   same thing at a glance across the whole rail. No state is carried by colour
   alone — live also gets a pill and all three are in the accessible name.
2. **Shelves are per channel, ordered by how much that channel has published,
   and "See all" goes to the channel's existing Videos tab.** A dedicated
   all-your-subscriptions page would be a second list of the same videos whose
   only distinguishing feature is being longer; `/channel/[handle]?tab=videos`
   already sorts and paginates them.
3. **The channel half reuses the directory's CTE.** `selectChannelRows` gained
   `followedOnly`, an `order` override and four columns rather than growing a
   fourth near-identical aggregate query (rule 10). The ordering override exists
   so "recently followed" doesn't have to be added to `ChannelSort`, which is
   the directory's public sort *menu* — a type change there is a UI change.
4. **Two endpoints, not one payload.** `/api/following/channels` is cheap and
   paints the rail; `/api/following/shelves` is the heavy per-channel window
   query underneath it. One combined response would make the rail wait for the
   shelves.
5. **Unfollowing removes the row.** `/following` is a list *of* your follows, so
   the shared `useFollowChannel` mutation drops the row from those caches rather
   than toggling a button on it; re-following invalidates instead, because the
   row carries stats the cache never had. One mutation still owns every surface.
6. **`clipCount` on this page is landscape-only.** It sits next to a link into
   the Videos tab, which is landscape-only, so the number and its destination
   have to agree. `ChannelListItem.clipCount` on `/channels` is unchanged and
   still counts shorts — changing it would move the directory's ranking.

**Rejected**: *A full-screen Instagram-style story viewer* — a sequential
autoplaying overlay is a different product surface (progress bars, gestures,
its own player) and the user chose navigation instead. *An `unseen`/`last_seen`
column on `follows`* — it would need a write on every impression to mean
anything, and a ring backed by a column nobody updates is worse than no ring.
*A `/following/videos` page* — see (2). *Feed feedback (⋮ "Not interested") on
shelf cards* — "don't recommend this channel" is meaningless on a channel's own
shelf; the honest control there is Unfollow. Feedback given on the home page is
still honoured by the query. *Putting Following in `discoverLinks`* — that
derives the public marketing header, where "Following" means nothing to a
visitor with no session; it went in `libraryLinks` instead.

**Consequences**: `all_handles` in `selectChannelRows` gained a `my_follows`
arm, so a channel you follow whose content was later deleted still appears in a
list whose entire job is to be complete — signed out that arm is empty, so
`/channels` is unaffected. Shelves cap at `FOLLOWING_SHELF_LIMIT` channels;
everyone past the cap is still in the rail and the manage list. `docs/following.md`
carries the full write-up, including where a real "unseen" marker would go if
one is ever wanted.
