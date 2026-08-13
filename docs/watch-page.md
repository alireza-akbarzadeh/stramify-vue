# Watch page

The destination page for anything playable: `/watch/[slug]`. One page serves
both VOD clips and live channels — see [ADR-014](./DECISIONS.md) for why, and
[ADR-015](./DECISIONS.md) for why chat polls instead of using a WebSocket.

## What a viewer gets

| | Clip (VOD) | Live channel |
|---|---|---|
| Player | Custom skin on Vidstack, on-demand | Same skin, `stream-type="live"` + LIVE badge |
| Meta line | views · published · duration | viewers · uptime |
| Sidebar | Up next (searchable) | Live chat **+** Up next (searchable) |
| Below | Comments — post, reply, like, delete | — |
| Always | like/dislike · share · save · follow channel · description | |

## Player

Vidstack's engine under a control bar this repo owns (ADR-016). Vidstack's
stock `media-video-layout` is **not** used, and neither
`default/theme.css` nor `default/layouts/video.css` is loaded — the skin
lives in `app/assets/css/player.css` and the markup in
`app/components/watch/player/`.

```
WatchPlayer.vue            media-player, provider, poster, gestures, spinner
└─ PlayerControls.vue      two rows: scrubber, then the button bar
   ├─ PlayerScrubber.vue   media-time-slider + hover timestamp
   ├─ PlayerVolume.vue     mute + slider that expands on hover
   ├─ PlayerSettings.vue   speed + quality radio groups
   └─ PlayerTooltip.vue    shared tooltip wrapper
```

Vidstack's elements are headless: they own interaction, keyboard shortcuts
and ARIA, and publish state as data attributes (`[data-paused]`,
`[data-muted]`, `[data-active]`, `[data-buffering]`) plus three slider
variables (`--slider-fill`, `--slider-progress`, `--slider-pointer`).
**Icon swapping and fill widths are pure CSS off those** — no component
mirrors playback state into its own reactive copy.

Two things to know before editing `PlayerSettings.vue`:

- The radio-item markup goes in through `v-html`. Vidstack clones a real
  `<template>` DOM node per option, but Vue's compiler turns a bare
  `<template>` in an SFC into a fragment and never emits the element.
- The speed and quality lists are populated by Vidstack from what the source
  offers. Quality is empty for a progressive MP4 and fills in for HLS, which
  is why nothing declares levels by hand.

## Slug resolution

`server/utils/watch.ts` → `resolveWatchTarget(slug)`:

1. `clips.id`, matched exactly (`clip-midnight-echo`)
2. `live_streams.streamer_name`, matched case-insensitively (`Viper_Squadron`)
3. otherwise `null` → the endpoint 404s → the page renders "we couldn't find
   that video"

The two namespaces can't collide: clip ids are prefixed slugs, live slugs are
streamer handles. No `c/` `l/` disambiguation is needed. **If you ever seed a
clip whose id is a bare handle, that assumption breaks** — keep the `clip-`
prefix.

`/live/[username]` is a redirect to `/watch/[username]`, kept so old links and
`e2e/live.spec.ts` still work.

## Component tree

```
app/pages/watch/[slug].vue          thin page
└─ WatchView.vue                    container: composables, loading/404/error
   └─ WatchLayout.vue               presentational shell, all data via props
      ├─ WatchPlayer / WatchMeta / WatchActions
      ├─ WatchChannelBar / WatchDescription
      ├─ WatchComments → WatchCommentItem     (clips)
      └─ aside: WatchChat → WatchChatMessage  (live)
                WatchUpNext → WatchUpNextFilters
                              WatchUpNextCard
```

`WatchLayout` takes no data of its own, which is what lets
`app/pages/zz-watch-preview.vue` drive it from
`app/components/watch/__fixtures__/watch.ts` — a dev-only preview of both
modes. **Those fixtures are never imported by `WatchView`**; the real page
always reads the API.

### Responsive layout

One flex column below `lg`, a two-column grid at `lg` and up:

```
flex flex-col gap-8  lg:grid lg:grid-cols-[minmax(0,1fr)_400px]
```

Below `lg` the `aside` is a normal block in flow, so **the sidebar renders
below the video**, with `order-2` keeping it above the comment list so live
chat sits directly under the player on a phone. On desktop the aside is
`lg:row-span-2` with a `lg:sticky lg:top-20` inner div (`top-20` clears the
fixed 4rem `AppHeader`).

### Filtering Up next

The rail carries a search box and All/Live/Clips chips
(`WatchUpNextFilters.vue`). Both narrow **the twelve items already on screen**
— `filterUpNext` in `app/utils/upNext.ts` is a pure function over the loaded
array, so there is no request, no debounce and no loading state. Searching
wider than the rail is what `/search` is for; a sidebar that quietly turns into
a second search page is a worse sidebar.

Three things it does that a naive substring filter wouldn't:

- **Terms are AND-ed across fields.** "nova ranked" finds nova's "Ranked ladder
  push" even though those words never sit together in either the title or the
  channel.
- **`meta` is not searched.** It's a pre-formatted "12.4k views · 3 days ago",
  so matching it would make "3" hit everything published in the last nine days
  — a result the viewer can't see the reason for.
- **The kind chips only render when the rail actually holds both kinds**
  (`upNextHasBothKinds`). The category-matched rail is often all clips, where a
  "Live" chip can do exactly one thing: empty the list.

The whole control row is hidden below five items (`FILTERABLE_FROM`) — two rows
of chrome to filter four cards you can already see is worse than four cards.

The filter resets when the **video** changes, keyed on the item ids rather than
on the array: the component stays mounted as you walk between watch pages, so a
stale query would read as "nothing is related to this video" — but a background
refetch returning the same twelve must not wipe what you're mid-way through
typing.

Chips are `aria-pressed` toggle buttons in a `role="group"`, deliberately *not*
the `role="tablist"` `HomeChipBar` uses: those chips swap which panel is shown
and name it via `aria-controls`, these narrow a list that's already there. A
visually-hidden `role="status"` announces "Showing 3 of 12 videos", since a
screen-reader user gets no equivalent of watching the list shorten.

## API

All routes Zod-validate at the boundary. Writes go through `requireUser`
(`server/utils/session.ts`), which 401s — authorization is server-side, never
just a hidden button.

| Route | Auth | Notes |
|---|---|---|
| `GET /api/watch/[slug]` | — | 404 on unknown slug |
| `GET /api/watch/[slug]/related` | — | same category, live first, max 12 |
| `POST /api/watch/[slug]/view` | — | clips only; **no-op for live** |
| `GET /api/watch/[slug]/comments` | — | `?sort=top\|new`; `[]` for live. Session-aware: sets `likedByMe`/`isMine` |
| `POST /api/watch/[slug]/comments` | ✔ | 1–1000 chars; `parentId` makes it a reply |
| `DELETE /api/watch/[slug]/comments/[id]` | ✔ | own comments only (403 otherwise); takes replies with it |
| `POST /api/watch/[slug]/comments/[id]/like` | ✔ | toggle; returns fresh total |
| `GET /api/watch/[slug]/chat` | — | `?since=<iso>`; `[]` for clips |
| `POST /api/watch/[slug]/chat` | ✔ | 1–200 chars |
| `GET /api/watch/[slug]/reaction` | — | `mine` is null when signed out |
| `POST /api/watch/[slug]/reaction` | ✔ | toggle; upsert on unique constraint |
| `GET /api/channels/[name]` | — | derived, no `channels` table |
| `POST /api/channels/[name]/follow` | ✔ | toggle, returns fresh summary |

## Tables

Migration `0003_*`. See `server/db/schema/`.

- **`comments`** — `clip_id`, one-level `parent_id`, nullable `user_id`
  alongside non-null `author_name`, so a seeded row and a real one render
  identically. `likes` is the **seeded baseline only**; real likes live in
  `comment_likes` and are added on top at read time.
- **`comment_likes`** — one row per (user, comment), unique on that pair so
  the toggle survives a double-click. Added in migration `0004_*`.
- **`chat_messages`** — `stream_id`, denormalized `author_name` so rendering
  needs no join and a deleted account doesn't blank chat history.
- **`reactions`** — `(target_id, target_kind)` instead of two tables. Unique
  on `(user_id, target_id)`: that constraint is what makes the toggle safe
  under a double-click.
- **`follows`** — `channel` is a **text handle, not an FK**. There's no
  `channels` table yet.

Plus a nullable `description` on `clips` and `live_streams`.

## Running it

```bash
pnpm db:migrate && pnpm db:seed && pnpm dev
```

`db:seed` runs clips → live → comments → chat in that order; comments and chat
have FKs into the first two, so **order matters**.

Try `/watch/clip-midnight-echo` (VOD), `/watch/Viper_Squadron` (live),
`/watch/nope` (404 state), and `/zz-watch-preview` (fixtures, both modes).

## Failure modes

- **Comments/chat seed fails with a foreign-key violation** — clips or live
  streams weren't seeded first. Run `pnpm db:seed`, not the sub-scripts.
- **Chat is stuck / doesn't update** — polling pauses when the tab is hidden,
  by design. It resumes on focus. If it's still stale, the poll is erroring:
  the panel shows "Chat disconnected" with a Reconnect button.
- **Chat message rejected** — 401 means signed out (the composer should have
  been a log-in prompt), 400 means empty or over 200 chars.
- **Like button snaps back after clicking** — the optimistic update was rolled
  back because the POST failed. Check the session; reactions require auth.
- **Live uptime keeps growing** — seeded `started_at` is fixed. Re-run
  `pnpm db:seed:live` to reset it. Real values arrive with Phase 7 ingest.
- **Viewer count never changes on a live page** — correct. It's a seeded
  value; `POST /view` deliberately doesn't touch it (ADR-014 point 8).
- **A clip 404s but exists** — the id must match exactly. Only live handles
  are case-insensitive.
- **A clip shows "No comments on this one yet"** — that clip has no seeded
  rows. Every seeded clip should have some; `e2e/watch.spec.ts` guards this
  by walking `/api/discovery/clips`. Re-run `pnpm db:seed:comments`.
- **A comment's like count jumps after clicking** — the displayed total is
  `comments.likes` (seeded baseline) **plus** real `comment_likes` rows. If
  the optimistic +1 and the server's total disagree, that sum is where to
  look, not the counter.
- **Player controls never appear** — `player.css` isn't loading. Controls
  are hidden until Vidstack sets `[data-visible]` on `media-controls`, so
  without the stylesheet they're invisible rather than unstyled.

## Known limits

- **No comment moderation.** Anyone signed in can post anything; there is no
  report, hide, pin or block path, and no rate limit beyond the 1000-char
  cap. This is the biggest real gap on the page (Phase 11, Admin).
- No comment editing — delete and repost. See ADR-016 for why it was deferred.
- The captions button is present but inert: no seeded source ships caption
  tracks. It lights up when one does.
- Chat is up to 5s behind. Phase 8 replaces the interval with crossws.
- Up-next is category-only — no watch history, no recommender. Its search is
  likewise only as wide as those twelve results; it can't surface a video the
  endpoint didn't return.
- Renaming a channel orphans its follows until a `channels` table exists.
