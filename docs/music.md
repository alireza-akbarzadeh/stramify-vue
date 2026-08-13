# Music (`/music`)

A browse surface over the `Music` slice of `clips`: one cinematic hero and a
set of horizontal shelves, where **hovering a card plays a muted few seconds of
the actual track**.

## What it is, and what it isn't

It is a *view*, not a content type. A "track" here is the same `clips` row that
`/clips`, `/category/music` and `/watch` already render — `shared/types/music.ts`
aliases `MusicTrack = Clip` rather than defining a parallel shape, so `toClip`
stays the single wire mapper and nothing new has to be kept in sync.

There is no `music` table, no playlist model, and no audio-only path. Those are
later-phase concerns; this page ships the browse experience over what the
database actually holds today.

## How the shelves are built

`server/utils/music.ts` runs **one** query — all landscape `Music` clips,
newest first — and derives every shelf from it in memory:

| Shelf | Ordering | Source column |
|---|---|---|
| New this week | recency | `clips.created_at` |
| Most played | views desc | `clips.views` |
| Long sessions | duration desc | `clips.duration_seconds` |
| From artists you follow | recency, filtered | `follows.channel` = `clips.creator` |

Every shelf is therefore backed by a column that already exists — none of them
is an editorial grouping the database can't justify.

**Why one query.** All four are re-orderings of the same rows, so four `order
by` round trips would read the same slice of the table four times. The category
is one of three enum values over a table that fills a browse page, not a
catalogue. If `clips` outgrows that, each ordering in `selectMusicPage` is
already a standalone seam to split on.

**Empty shelves never ship.** A derived shelf under `MUSIC_MIN_SHELF_ITEMS` (3)
is dropped, because at that size it's the first rail again with a different
heading. "New this week" is exempt — one rail beats none.

**The hero is most-watched, deliberately not `clips.featured`.** That column
reads like an editorial pick but `toClip` treats it as a liveness flag: a
featured row renders its age as `"Now"` and its count as `"watching"`. Seating
the hero on it would caption a not-live track "Now · 12.4k watching".

The follows shelf is the only personalised part, and it simply doesn't ship
when signed out — `/api/music` reads without a session so the page opens for a
first-time visitor rather than gating a browse surface behind an account.

## Hover-to-preview

The centrepiece, in `app/composables/useHoverPreview.ts` and
`app/utils/preview.ts`.

Hovering a card, then *staying* there for 450ms, mounts a bare muted `<video>`
over the still, seeks past the intro, plays ~9s, and fades back. A progress
line tracks the window and the corner chip swaps from the duration to a
"Preview" badge with an animated level meter.

The rules it enforces, and what each one prevents:

- **Intent delay (450ms).** Sweeping a cursor across a rail crosses six cards.
  Firing on contact would open six video connections for a gesture that meant
  none of them. Nothing is requested until the pointer settles.
- **One preview per page.** A module-level token; arming a second card stops
  the first. Without it, a slow drag down a grid leaves a trail of playing
  videos.
- **Muted, always.** A browse page that makes noise under the cursor is
  hostile even where autoplay policy allows it. Sound is what `/watch` is for.
- **Fine pointers only** (`hover: hover and pointer: fine`). On touch, "hover"
  is a tap, and a preview would start at the moment the tap navigates away.
- **Reduced motion opts out entirely** — not a slower preview, no preview.
- **Elements are unmounted, not paused.** An idle rail holds zero video
  elements; `stop()` also drops the buffer rather than pinning decoded frames.

### The HLS caveat (read this before "fixing" a card that won't preview)

A bare `<video>` plays HLS **only where the browser supports it natively** —
Safari does, Chrome and Firefox do not. There is no standalone `hls.js` in this
project (Vidstack ships its own loader, but pulling a full player into a hover
affordance costs more than the affordance is worth).

So `canPreviewSource()` declines `.m3u8` outside Safari, and those cards keep
their still and their hover lift. **This is working as designed, not a bug.**
The seeded Music catalogue is deliberately progressive mp4 for that reason; the
two HLS clips in `seed-clips.mjs` stay HLS so `/watch`'s real player keeps
exercising that path.

If HLS previews ever become a requirement, the change is to add a media-source
loader behind `canPreviewSource` — not to special-case it in the card.

## The hero's ambient loop

`useAmbientVideo` is a separate composable, not a flag on `useHoverPreview`:
there's no pointer intent to wait for, no single-slot arbitration and no window
to end — it just loops. What the two genuinely share is `canPreviewSource`.

It stops when it isn't being watched (scrolled out of view via
`useIntersectionObserver`, or the tab backgrounded via `useDocumentVisibility`).

It renders **client-side only** (`hydrated` in the composable). This is
load-bearing: `usePreferredReducedMotion` can't know the preference during SSR
and reports `no-preference`, so a server render would emit the `<video>` and a
reduced-motion client would immediately drop it — a hydration mismatch on the
page's largest element. The still is the SSR content and takes the LCP either
way.

## Files

```
shared/types/music.ts              MusicTrack (= Clip), MusicShelf, MusicPage, limits
server/utils/music.ts              selectMusicPage — the one query + the four orderings
server/api/music/index.get.ts      GET /api/music, reads without a session
app/composables/useMusic.ts        TanStack query; viewer id in the key
app/composables/useHoverPreview.ts hover state machine
app/composables/useAmbientVideo.ts hero loop
app/utils/preview.ts               canPreviewSource / previewStartTime (pure, tested)
app/components/music/
  MusicView.vue                    states: loading / error / empty / loaded
  MusicHero.vue                    featured track + "up next" strip
  MusicShelf.vue                   one rail (wraps HomeRail)
  MusicCard.vue                    the hover-preview card
  NowPlayingBars.vue               the level meter
  MusicSkeleton.vue                loading shape, same ratios as the real thing
app/pages/music.vue                route
```

Animation follows the `motion` skill's Track B: `Reveal` for scroll entrance,
CSS transforms on the project's expo-out curve
(`cubic-bezier(0.16, 1, 0.3, 1)`) for hover. The `equalize` keyframe lives in
`main.css` with the rest of the app's animations.

## Common failure modes

| Symptom | Cause |
|---|---|
| A card never previews | HLS source outside Safari — expected, see above. Check `videoUrl`. |
| No card previews anywhere | Touch/coarse pointer, or `prefers-reduced-motion: reduce`. |
| Hero shows a still, cards preview fine | Hero clip is HLS; or reduced motion; or autoplay refused. |
| A shelf is missing | Under 3 items and dropped by `keepShelf`, or signed out (follows shelf). |
| Page empty | No **landscape** `Music` clips. Vertical ones belong to `/shorts` and are filtered out. |
| Rails widen the page | A `min-w-0` was dropped — see the note in `layouts/dashboard.vue`. |

## Modifying it

- **New shelf**: add an ordering in `selectMusicPage` and an id to
  `MusicShelfId`. Keep it derived from a real column.
- **Preview length / start point**: `PREVIEW_SECONDS` and
  `PREVIEW_START_FRACTION` in `app/utils/preview.ts`. Both are covered by
  `preview.spec.ts`.
- **Card size**: the breakpoint widths in `MusicShelf.vue` are mirrored in
  `MusicSkeleton.vue`. Change both or the page will jump when the query lands.
