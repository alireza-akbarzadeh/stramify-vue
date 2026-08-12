# Shorts — implementation plan

> Status: **plan only, nothing built.** `app/pages/shorts.vue` is still a
> `ComingSoon` placeholder and `/shorts` is badged `Phase 6` in
> [`app/utils/nav.ts`](../app/utils/nav.ts).
>
> Work top to bottom through [Milestones](#milestones). Tick the boxes in
> [Where to resume](#where-to-resume) as you land each one — that section is
> the handoff, the rest of this file is the reasoning behind it.

## What this is

A vertical, full-screen, snap-scrolling short-form feed at `/shorts` — the
YouTube Shorts / Instagram Reels interaction, on this app's design tokens and
this app's existing data. One short fills the viewport; you flick (or press
`↓`, or scroll, or click a chevron) to the next; the active one plays and
every other one is paused and rewound.

"Full featured" here means the whole loop a viewer expects: autoplay, sound
toggle, scrubbing, like/dislike, comments, share, save, follow, view counting,
deep links, keyboard control, and real loading/empty/error states — not a
carousel of `<video>` tags.

## Narrowing — what is *not* in this plan

These are cut deliberately, each for a reason, not because they were forgotten.

| Cut | Why |
|---|---|
| **Uploading / creating a short** | There is no upload pipeline anywhere in the app yet, and `CLOUDFLARE_STREAM_API_TOKEN` is empty (PROGRESS.md, open question 2). Building a fake uploader would violate CLAUDE.md rule 2. Shorts get **seeded** vertical videos, exactly like clips and live did. Upload lands with the video pipeline, for every kind at once. |
| **A shorts recommender** | The home feed's ranking (`server/utils/home.ts` `SCORE`) is already written down and defensible. Shorts reuse it. No watch history exists, so a "for you" model would be invented from nothing. |
| **Remix / duet / stitch, effects, filters, music library** | Creation-side features. Same blocker as upload. |
| **A separate shorts comment system** | `comments` already FKs `clips.id` and the write endpoints already exist. Shorts reuse them verbatim. |
| **Live verticals** | `live_streams` stays landscape-only. One kind at a time. |
| **A "Shorts" shelf on `/`, a Shorts tab on `/channel/[handle]`** | Real follow-ons, but they're surfaces *onto* the feed. Build the feed first. Listed under [Follow-ons](#follow-ons). |

## The one architectural decision

**A short is a `clips` row with `orientation = 'vertical'`. There is no
`shorts` table.** Write this up as **ADR-021** before you write code.

Why this and not a new table:

- **Everything downstream already keys on `clips.id`.** `comments.clip_id` is a
  real FK; `reactions.target_kind` is a pg enum of `('clip','live')`;
  `WatchlistKind` is `'clip' | 'live'`; `server/utils/home.ts`'s `CANDIDATES`
  union, `search.ts`, `channels.ts` and `dashboard.ts` all read `clips`. A
  `shorts` table means a new enum value, a second comments FK (or a nullable
  pair), a third union arm, and a migration in each — a lot of churn to express
  "this video is tall".
- **It matches how this repo already models things.** Categories are derived
  from an enum on `clips` with no `categories` table (ADR-013 era); `channels`
  holds identity only and every number stays derived (ADR-018). Same instinct.
- **The cost is honest and small**: every query that renders a 16:9 card must
  now say "landscape only". That's one `where` clause in five places, listed in
  [M1](#m1--data-and-the-endpoint). Get it wrong and a 9:16 thumbnail shows up
  letterboxed in the clips grid — visible immediately, not a silent bug.

Shape:

```ts
// server/db/schema/clips.ts
export const clipOrientationEnum = pgEnum('clip_orientation', ['landscape', 'vertical'])
// ...
orientation: clipOrientationEnum('orientation').notNull().default('landscape')
```

`default('landscape')` means every existing row keeps behaving exactly as it
does today — the migration is additive and non-breaking. Duration is *not* part
of the definition: a short is defined by shape, not by a 60-second rule we'd
then have to enforce somewhere.

## Preconditions — do these before M1

1. **There is a pending, ungenerated migration in the working tree that isn't
   yours.** `server/db/schema/follows.ts` has an uncommitted `notify` column
   (from the notifications work — see the untracked
   `app/components/channel/ChannelNotifyMenu.vue`,
   `server/api/channels/[name]/notify.post.ts`). Migrations `0000`–`0004` exist
   on disk and cover every table, but **not** that column.

   Run `pnpm db:generate` **first**, on its own, so `0005_*` contains only
   `follows.notify`. Then generate the shorts column as `0006_*`. Do not let
   the two get bundled into one migration — if the notify work is reverted,
   you'd have to unpick shorts out of the same file.

   ```bash
   pnpm db:generate && pnpm db:migrate
   ```

2. **Confirm the toolchain is green before you add to it.** Four consecutive
   sessions (watch page, dashboard, channels, home feed) landed without running
   anything — see the ⚠️ blocks in [PROGRESS.md](./PROGRESS.md). Establish a
   baseline so a failure during this work is known to be yours:

   ```bash
   pnpm lint && pnpm typecheck && pnpm test
   ```

   If it's already red, note what's red in PROGRESS.md and move on — don't
   silently absorb someone else's breakage into the shorts diff.

3. **Read the `motion` skill** (`.claude/skills/motion/SKILL.md`). This feature
   is dense with animation and it gets both tracks wrong easily: the comments
   sheet is Track A (Reka `data-state` + `tw-animate-css`), the like burst and
   slide transitions are Track B (`motion-v` / the primitives in
   `app/components/motion/`).

## UX specification

### Mobile (`< md`)

Full-bleed, one short per `100svh` page (`svh`, not `vh` — `vh` is wrong under
mobile browser chrome and produces a permanently mis-snapped feed).

```
┌───────────────────────────┐
│                           │  video, object-cover, 9:16
│                           │
│                        ♥  │  ← action rail, bottom-aligned,
│                       12k │    right edge, over a soft scrim
│                        ⌄  │
│                       340 │
│                        💬 │
│                        88 │
│                        ↗  │
│                        🔖 │
│                        🔊 │
│ ▓▓▓▓ scrim ▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ◯ @canvas_queen  [Follow] │
│ Title, two lines max…     │
│ #Creative                 │
│━━━━━━━━━──────────────────│  ← progress, 2px, 8px on drag
└───────────────────────────┘
```

- **Tap anywhere** → play/pause, with a center icon that fades in and out.
- **Double-tap** → like, with `PopBurst` (`app/components/motion/PopBurst.vue`)
  firing at the tap point. Suppress the play/pause toggle when a double-tap
  resolves.
- **Vertical drag** → the native snap scroll. Don't intercept it.

### Desktop (`≥ md`)

Not a stretched mobile view. A centred 9:16 card with the chrome *beside* it,
so nothing ever covers the video:

```
        ┌──────────────┐
   ▒▒▒▒ │              │  ♥ 12k     ⌃
   ▒▒▒▒ │              │  ⌄ 340
   ▒▒▒▒ │    video     │  💬 88     ⌄
   ▒▒▒▒ │              │  ↗
   ▒▒▒▒ │              │  🔖
        │ ◯ @handle    │  🔊
        │ Title        │
        └──────────────┘
   ↑ ambient backdrop      ↑ rail    ↑ prev/next
```

- **Ambient backdrop**: the current short's thumbnail behind the card, `blur-3xl
  scale-110 opacity-40`, cross-fading on slide change. Cheap (it's the poster
  we already fetched) and it's what makes the page feel finished rather than a
  card on a grey field.
- **Prev/next chevrons** at the far right, disabled at the ends.
- **Collapse the app sidebar on this route.** Check whether
  `components/ui/sidebar`'s `SidebarProvider` accepts a `defaultOpen` /
  controlled `open` prop before assuming it; if it doesn't, that's a small
  addition to the provider, not a reason to skip it.

### Keyboard (all breakpoints)

| Key | Action |
|---|---|
| `↓` / `j` / `PageDown` | next short |
| `↑` / `k` / `PageUp` | previous short |
| `Space` / `k`-free alt | play/pause |
| `m` | mute/unmute |
| `←` / `→` | seek ∓5s |
| `l` / `c` / `s` | like / comments / save |
| `Esc` | close the comments sheet |

Bind on the deck element with a real `tabindex="0"` and a visible
`focus-visible:ring-2 focus-visible:ring-ring`, not on `window` — a global
handler steals `Space` from the comment composer.

### Accessibility (non-negotiable, PROMPT.md §17)

- **Autoplay starts with sound**, and drops to silent only when the browser
  refuses (see `useAutoplayGate`). WCAG 1.4.2 asks for *a mechanism* to stop
  auto-playing audio over 3s, not for silence: the mute button sits at the top
  of the frame, `m` is bound globally on the page, and `Space` stops playback
  outright — so the SC is met by the controls rather than by the default. If
  that trade is ever revisited, revisit it here first.
- **A real pause control** exists in the rail, not just the tap surface — WCAG
  2.2.2, since the content auto-plays for more than 5s.
- **`prefers-reduced-motion`**: every UI animation gets `motion-reduce:
  animate-none` (Track A) or is gated on `useReducedMotion()` (Track B), per
  the motion skill. Video playback itself is not motion-gated — but *do* honour
  `navigator.connection?.saveData`: don't autoplay, show the poster and a play
  button.
- The scroller is `role="feed"`, each slide `role="article"` with
  `aria-posinset`/`aria-setsize`, so a screen reader announces "3 of 24".
- Every icon button gets an `aria-label` with its count, matching
  `WatchActions.vue`'s existing `` `Like — ${likes} likes` `` pattern.
- Titles/handles sit on a scrim with a real contrast check, not white-on-video.

### Performance

- **Mount at most 3 players.** The active slide plus one either side get a real
  `<media-player>`; every other slide renders the poster `<img>` only.
  Twenty-four Vidstack instances is twenty-four media engines.
- `preload="none"` on the off-screen pair, `"auto"` on the active one.
- `loading="lazy"` + explicit `width`/`height` on posters.
- Prefetch the next page when the active index is within 4 of the end.
- Pause everything on `visibilitychange` → hidden.

## File manifest

New unless marked. Paths are final — use them.

**Shared**
- `shared/types/shorts.ts` — `Short`, `ShortsPage`, `SHORTS_PAGE_SIZE`
- `shared/utils/shorts.ts` + `.spec.ts` — pure index/window math

**Server**
- `server/db/schema/clips.ts` *(modify)* — `clipOrientationEnum` + `orientation`
- `server/utils/shorts.ts` — `selectShorts()`
- `server/api/shorts/index.get.ts` — Zod-validated `cursor` / `seed`
- *(modify)* `server/utils/{discovery,home,channels,search}.ts` — landscape filter
- `scripts/seed-shorts.mjs` + a `db:seed:shorts` package script

**Client**
- `app/pages/shorts/index.vue` *(replaces `app/pages/shorts.vue`)*
- `app/pages/shorts/[id].vue`
- `app/composables/useShortsFeed.ts` — infinite query, mirrors `useHomeFeed.ts`
- `app/composables/useShortsDeck.ts` — active index, observer, keyboard, URL sync
- `app/composables/useShortsSound.ts` — muted state, persisted
- `app/components/shorts/`:
  `ShortsView.vue` · `ShortsDeck.vue` · `ShortsSlide.vue` · `ShortsPlayer.vue` ·
  `ShortsOverlay.vue` · `ShortsActionRail.vue` · `ShortsProgress.vue` ·
  `ShortsNavButtons.vue` · `ShortsCommentsSheet.vue` · `ShortsSkeleton.vue` ·
  `ShortsEmpty.vue`
- `app/assets/css/shorts.css` — Vidstack skin overrides, alongside `player.css`
- *(modify)* `app/utils/nav.ts` — drop the `Phase 6` badge from the Shorts link

**Reused as-is — do not rebuild these**
`useWatchReaction` (`useWatchEngagement.ts`) · `useChannelFollow`
(`useChannel.ts`) · `useWatchComments` / `useWatchCommentMutations` ·
`useViewCounter` · `stores/watchlist` · `ChannelAvatar` · `PopBurst` ·
`components/ui/{button,sheet,skeleton,tooltip}` · every endpoint under
`server/api/watch/[slug]/`.

**Docs**
- ADR-021 appended to `docs/DECISIONS.md`
- A "Shorts session" block appended to `docs/PROGRESS.md`
- This file, updated from "plan" to "how it works" as it lands

## Milestones

Each is independently shippable and independently verifiable. Don't start the
next one until the previous one's **Done when** is actually true.

### M1 — Data and the endpoint

1. Add `clipOrientationEnum` + `orientation` to `server/db/schema/clips.ts`.
2. `pnpm db:generate && pnpm db:migrate` (after the precondition
   migration, as its own file).
3. **Exclude verticals from the five landscape surfaces.** Add
   `orientation = 'landscape'` to:
   - `server/utils/discovery.ts` — the `/clips` grid and category clips
   - `server/utils/home.ts` — the `CANDIDATES` clip arm (both `selectHomeFeed`
     and `selectFollowingFeed` read it)
   - `server/utils/channels.ts` — the channel Videos tab and the directory's
     clip counts
   - `server/utils/search.ts` — until search can route a hit to `/shorts/[id]`
   - `server/utils/dashboard.ts` — decide explicitly whether a creator's shorts
     count in their top-clips table. Recommendation: **yes, include them** (it's
     their content and their views); just make sure the table doesn't render a
     9:16 thumbnail in a 16:9 slot.
4. `scripts/seed-shorts.mjs` — 12–18 rows, `orientation: 'vertical'`, real
   9:16 sources. **`curl -I` every URL before committing it**, same discipline
   as `seed-clips.mjs`; a dead source here means an empty feed that looks like
   a bug. Spread them across all three categories and across existing seeded
   channel handles so follow/avatar/comment joins have something to hit.
   Wire `db:seed:shorts` into the `db:seed` chain **after** `db:seed:channels`.
5. `shared/types/shorts.ts`:
   ```ts
   export interface Short {
     id: string; title: string; channel: string
     category: ClipCategory; description: string
     videoUrl: string; image: string
     avatarUrl: string | null
     views: string          // pre-formatted, e.g. "12.4k views"
     age: string            // pre-formatted, e.g. "3d ago"
     durationSeconds: number
   }
   export interface ShortsPage { items: Short[]; nextCursor: number | null }
   export const SHORTS_PAGE_SIZE = 12
   ```
6. `server/utils/shorts.ts` — `selectShorts({ cursor, limit, seedId, userId })`.
   Reuse `home.ts`'s `SCORE` shape (extract it if that's clean, copy it with a
   comment pointing at the original if it isn't — do **not** let two rankings
   silently drift). `seedId` puts one specific short first on page 0 and
   excludes it from later pages, which is what makes `/shorts/[id]` work.
7. `server/api/shorts/index.get.ts` — Zod on `cursor` (int ≥ 0) and `seed`
   (string, optional). **Watch the Zod 4 `readonly` tuple trap** that the
   dashboard, channels and home sessions all hit with `z.enum(...)`.

**Done when**: `curl 'localhost:3000/api/shorts'` returns seeded rows;
`curl 'localhost:3000/api/shorts?seed=<id>'` returns that id first; `/clips`,
`/`, `/channels` and search show **no** vertical rows.

### M2 — The deck (this is the hard part)

1. `useShortsFeed.ts` — `useInfiniteQuery`, copy the shape of `useHomeFeed.ts`.
2. `useShortsDeck.ts` — the whole interaction, in one composable:
   - `activeIndex` driven by an `IntersectionObserver` on the slides
     (`threshold: 0.6`, root = the scroller).
   - `goTo(i)` → `scrollIntoView({ behavior, block: 'start' })`, honouring
     reduced motion for `behavior`.
   - keyboard map from [Keyboard](#keyboard-all-breakpoints).
   - `isWindowed(i)` → `Math.abs(i - activeIndex) <= 1`.
   - fires `next-page-needed` when `activeIndex >= items.length - 4`.

   Keep the composable's own logic under ~15 lines per function (CLAUDE.md
   rule 10) — the observer, the keymap and the windowing are three functions,
   not one.
3. `shared/utils/shorts.ts` — pull the pure parts out (`clampIndex`,
   `isWithinWindow`, `shouldPrefetch`) so they're unit-testable without a DOM.
4. `ShortsDeck.vue` — `h-[100svh] snap-y snap-mandatory overflow-y-auto
   overscroll-y-contain` + `scrollbar-width: none`. Each `ShortsSlide.vue` is
   `snap-start snap-always h-[100svh]`.
5. `ShortsPlayer.vue` — Vidstack, `playsinline`, `muted` initially, `loop`,
   `:preload="active ? 'auto' : 'none'"`. Play on activate, **pause and reset
   `currentTime` to 0** on deactivate (a short you scroll back to should start
   over, not resume mid-sentence).
6. `ShortsSkeleton.vue` / `ShortsEmpty.vue` + an error state. Mirror the real
   slide's box model exactly, like `HomeVideoCardSkeleton` does, so the first
   paint doesn't jump.
7. `app/pages/shorts/index.vue` replaces `app/pages/shorts.vue`. Keep
   `layout: 'dashboard'`; collapse the sidebar.

**Done when**: the feed scrolls and snaps on trackpad, wheel, touch and
keyboard; exactly one video is playing at any moment; at most three
`<media-player>` elements exist in the DOM (check with
`document.querySelectorAll('media-player').length`); no console errors;
`/shorts` is single-column with no horizontal overflow at 375×812.

### M3 — Chrome and actions

1. `ShortsOverlay.vue` — scrim, `ChannelAvatar` + handle linking to
   `/channel/[handle]`, Follow pill via `useChannelFollow`, title (2-line
   clamp, tap to expand), category chip linking to `/category/[slug]`.
2. `ShortsActionRail.vue` — like / dislike / comments / share / save / sound /
   overflow. Wire to `useWatchReaction`, `stores/watchlist`, and the same
   clipboard+`toast` share as `WatchView.vue`. Reuse `PopBurst` on like and
   save exactly as `WatchActions.vue` does.
   > `WatchActions.vue`'s share button was reported broken by the user and is
   > **not fixed** (PROGRESS.md). Reproduce it in the console before copying
   > that handler, or you'll copy the bug.
3. `ShortsProgress.vue` — 2px bar, grows to 8px with a thumb while dragging,
   pointer-drag to seek. Reuse the technique in
   `app/components/watch/player/PlayerScrubber.vue` rather than inventing one.
4. `ShortsNavButtons.vue` — desktop only, `md:flex`.
5. `useShortsSound.ts` — mute state in `localStorage` (`useLocalStorage` from
   VueUse, already a dependency), applied to every slide so unmuting is sticky.
6. View counting: `useViewCounter(activeSlug)` — call `count()` once the active
   short has been *playing* for ≥3s, not on activation, or a fast flick past
   ten shorts records ten views.
7. Double-tap-to-like on touch; `PopBurst` at the pointer position.

**Done when**: like/dislike/save persist across a reload; follow reflects on
`/channel/[handle]`; the sound choice survives a reload; the view count
increments once and only once per short per session.

### M4 — Comments

`ShortsCommentsSheet.vue` wrapping the existing `WatchComments` tree and
`useWatchComments` / `useWatchCommentMutations` — no new endpoints, no new
types.

- One Reka `Sheet` with a responsive `side`: `bottom` (85svh) under `md`,
  `right` (420px) at `md+`. **Track A motion** — `data-[state=open]:animate-in`
  / `data-[state=closed]:animate-out`, `duration-200`,
  `motion-reduce:animate-none`. A `transition-*` class here means the sheet
  snaps shut with no exit animation; that's pitfall #1 in the motion skill.
- Pause the video while the sheet is open on mobile (it's covering it) — keep
  playing on desktop (it isn't).
- Signed out → the existing log-in prompt the composer already renders.

**Done when**: post, reply, like and delete all work from within the feed;
`Esc` closes; focus returns to the comments button.

### M5 — Deep links and polish

1. `app/pages/shorts/[id].vue` — same `ShortsView`, `:seed-id="route.params.id"`.
2. **URL sync as you scroll.** Set `definePageMeta({ key: 'shorts' })` on
   *both* pages so the component instance is reused, then `router.replace()`
   on slide change. **Verify the page does not remount** — if it does, fall
   back to `history.replaceState` and say so in a comment. Never `push`: 24
   history entries per session makes the back button useless.
3. Share copies the canonical `/shorts/[id]` URL, not `/watch/[id]`.
4. Ambient blurred backdrop on desktop, cross-fading between slides.
5. `saveData` / slow-connection path: poster + play button, no autoplay.
6. Drop the `Phase 6` badge in `app/utils/nav.ts` — it's the last step, because
   `headerLinks` derives from `discoverLinks` by filtering badged entries, so
   removing the badge is what publishes `/shorts` to the marketing header too.

**Done when**: `/shorts/<id>` opens on that short; scrolling rewrites the URL;
copying it and pasting it in a new tab lands in the same place; back leaves the
feed in one press.

### M6 — Tests and docs

- `shared/utils/shorts.spec.ts` — clamping, windowing, prefetch threshold.
- `app/components/shorts/ShortsActionRail.spec.ts` — counts, `aria-pressed`,
  emitted events. Follow `WatchChannelBar.spec.ts` / `HomeVideoCard.spec.ts`.
- `app/composables/useShortsDeck` — cover the pure parts through
  `shared/utils/shorts`; don't try to unit-test `IntersectionObserver`.
- `e2e/shorts.spec.ts` — walk `/api/shorts` for a real id rather than
  hard-coding a slug (`e2e/watch.spec.ts` learned this the hard way): feed
  renders, `↓` advances, exactly one video plays, `/shorts/[id]` deep link
  lands, 375×812 has no horizontal overflow.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`.
- ADR-021 in `docs/DECISIONS.md`; append a session block to `docs/PROGRESS.md`;
  rewrite this file's header from "plan" to "how it works".
- `graphify update .`

**Done when**: all four commands are green and you've had eyes on `/shorts` in
a real browser, both themes, signed in and signed out, at 375×812 and 1440×900.

## Known traps

1. **`100vh` on mobile.** Use `100svh`. `vh` includes the collapsible browser
   chrome, so every slide is taller than the viewport and the snap points sit
   permanently off by ~60px.
2. **Autoplay rejection.** `play()` returns a promise that rejects when the
   browser blocks it. Catch it and fall back to a visible play button —
   an unhandled rejection here is a black screen with no explanation.
3. **iOS Safari fullscreen hijack.** Without `playsinline` iOS takes any
   playing video fullscreen and the whole feed metaphor dies.
4. **Scroll-snap + programmatic scroll fight each other.** `goTo()` while a
   momentum scroll is in flight lands between snap points. Debounce the
   observer and ignore `goTo` while `scrolling` is true.
5. **`overscroll-y-contain`** on the scroller, or the last slide pulls the
   whole page (and on iOS, triggers pull-to-refresh).
6. **The `orientation` filter is easy to half-apply.** Five call sites in M1 —
   grep for `from clips` and `db.select().from(clips)` and check every hit.
7. **`db.execute<Row>()` generics.** `server/utils/{home,channels}.ts` both
   needed a `type` alias with an index signature for this. Copy that shape in
   `server/utils/shorts.ts` rather than rediscovering it.
8. **Don't fight Reka's presence machine** with `motion-v`'s `AnimatePresence`
   on the comments sheet. Motion skill, pitfall #3.

## Follow-ons

Not in this plan; each is small once the feed exists.

- A **Shorts shelf on `/`** — a horizontal rail of vertical cards, the way
  YouTube interleaves them. Reuses `/api/shorts` with a small limit.
- A **Shorts tab on `/channel/[handle]`** — `useChannelTab.ts` already puts tab
  state in the URL; this is a fifth tab and a `?orientation=vertical` param on
  the existing videos endpoint.
- **Search routing** — include verticals again and send those hits to
  `/shorts/[id]` instead of `/watch/[id]`.
- **Watchlist rendering** — a saved short currently renders in a 16:9 slot on
  `/watchlist`. Either give `WatchlistItem` an orientation or crop it.

## Where to resume

- [ ] **P0** Generate + apply the pending `follows.notify` migration, on its own
- [ ] **P1** Baseline `lint` / `typecheck` / `test`, record what's already red
- [ ] **P2** Write ADR-021 (shorts are vertical clips)
- [ ] **M1** Schema, landscape filters, seed, `/api/shorts`
- [ ] **M2** Deck — snap scroller, windowed players, skeleton/empty/error
- [ ] **M3** Overlay, action rail, progress, sound, view counting
- [ ] **M4** Comments sheet
- [ ] **M5** `/shorts/[id]`, URL sync, ambient backdrop, unbadge the nav link
- [ ] **M6** Specs, e2e, full toolchain, docs, `graphify update .`
