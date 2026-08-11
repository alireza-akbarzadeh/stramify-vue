# Following (`/following`)

The page that answers "who do I follow, and what have they published". Until
this was built, `follows` rows existed and the Follow button worked, but there
was no surface anywhere in the app that listed them — and `/following` was a
`ComingSoon` placeholder that wasn't linked from any nav.

## What it is

Three sections, ordered by how urgent the question is:

1. **Story rail** — every followed channel as an avatar in a gradient ring.
   Live channels first, then most recently followed. Tapping a circle opens the
   channel page, or goes straight to `/watch/<slug>` when the channel is on air.
2. **Per-channel shelves** — one horizontally scrolling row per channel, up to
   10 recent videos each, channels with the most videos first. "See all" opens
   that channel's Videos tab.
3. **Manage list** — every follow again, this time with the notification bell
   and Unfollow.

The rail and the manage list show **every** follow. Only the shelves are capped
(`FOLLOWING_SHELF_LIMIT`), because 50 follows would otherwise mean 500 cards.

## Why the ring has three states

A ring that lights for everyone says nothing, so `storyRing()` returns one of:

| State   | Ring                                    | Also marked by         |
| ------- | --------------------------------------- | ---------------------- |
| `live`  | Fixed accent conic gradient, rotating   | "LIVE" pill + a11y name |
| `new`   | The channel's own hue, held still       | a11y name              |
| `quiet` | Flat `bg-border`                        | —                      |

`new` means "published within `FOLLOWING_FRESH_DAYS`". It is deliberately **not**
an unread marker and the UI never calls it one — nothing in the schema tracks
what a viewer has already watched, and a ring that implied otherwise would be
fake functionality (CLAUDE.md rule 2). The accessible name says "new this week".

Live uses one fixed gradient for every channel rather than a per-channel hue:
live is the one state that has to mean the same thing at a glance across the
whole rail.

## Motion

Track B by the `motion` skill's rule (page-owned content, no Reka presence), but
implemented in plain CSS rather than `motion-v` — an infinite ambient loop and a
hover scale are what the compositor does for free.

- `@keyframes story-ring` in `app/assets/css/main.css`, registered as
  `--animate-story-ring: story-ring 6s linear infinite`. A conic gradient's
  *angle* isn't animatable, so the element painting it is rotated instead.
- The rotation and the hover scale live on **different elements**. A running
  animation owns `transform` outright, so a scale utility on the spinning ring
  would simply be ignored.
- The gradient's first and last stops are the same colour, so a full turn loops
  without a visible seam.
- `motion-reduce:animate-none` on the ring; the live state still reads from the
  pill and the gradient.

## Data flow

| Layer | Channels half | Videos half |
| --- | --- | --- |
| Endpoint | `GET /api/following/channels` | `GET /api/following/shelves` |
| Server util | `listFollowedChannels` (`utils/channels.ts`) | `listFollowingShelves` (`utils/following.ts`) |
| Composable | `useFollowedChannels` | `useFollowingShelves` |
| Cache key | `['following','channels']` | `['following','shelves']` |

Two queries, not one payload, so the cheap channel list can paint the story rail
while the heavier shelf query is still in flight.

Both endpoints return `[]` rather than a 401 when signed out — matching
`/api/home/following` — and both scope to `userId` taken from the session, never
from the request. There is no way to ask for someone else's follows.

### Why `listFollowedChannels` lives in `channels.ts`

It's the directory's aggregate query with one `followedOnly` flag flipped. That
CTE computes followers, views, clip counts, live state and categories in one
statement; duplicating it into `following.ts` to make the filenames tidier is
exactly the trade CLAUDE.md rule 10 says not to make. `selectChannelRows` gained
three things for this:

- `followedOnly` — inner-filters on `my_follows`.
- `order` — an ordering override, so "recently followed" doesn't have to be
  added to `ChannelSort`, which is the directory's public sort *menu*.
- New columns: `landscape_clip_count`, `last_published`, `live_label`, and
  `notify` / `followed_at` off the follow row.

`all_handles` also gained a `my_follows` arm. Without it, following a channel
whose content was later deleted would silently vanish from a list whose entire
job is to be complete.

### Counts

`FollowedChannel.clipCount` is **landscape clips only**, which is the set
`/channel/[handle]?tab=videos` lists. `ChannelListItem.clipCount` on `/channels`
still counts every clip including shorts — unchanged, because changing it would
move the directory's numbers. The two columns exist side by side for that
reason; use the landscape one anywhere the number sits next to a link into the
Videos tab.

### The shelf query

`listFollowingShelves` does all its cutting in Postgres: `channel_totals` picks
the shelves *before* the window function runs, so the work is bounded at
`FOLLOWING_SHELF_LIMIT × FOLLOWING_SHELF_SIZE` rows however much a viewer
follows. Feed feedback (`notSuppressed`) is applied in the `visible` CTE, before
the totals, so a channel you've hidden most of doesn't outrank one you watch.

Clips only, no live sessions — "See all" goes to a landscape-clips tab, so
counting anything else would put a number on screen the destination contradicts.

## Cache consistency

Following is togglable from four surfaces (watch page, channel page, directory,
this page), so there is **one** mutation — `useFollowChannel` in
`composables/useChannel.ts` — and it patches every cache that can hold the
answer. `/following` is the odd one out: it's a list *of* the channels you
follow, so unfollowing **removes the row** rather than flipping a button on it.

- Unfollow → `dropFollowedChannel` / `dropFollowingShelf` in `onMutate`.
- Re-follow → can't be patched back (the row carries stats and a shelf of videos
  this cache has never seen), so it invalidates `['following']`.
- Bell → `useChannelNotify` also patches `['following','channels']`, with the
  previous list snapshotted for rollback.

The query keys and the pure cache edits live in `app/utils/following.ts` rather
than in the composable, because `useChannel.ts` imports them and the other way
round would close an import cycle.

## States

| State | What renders |
| --- | --- |
| Signed out | `FollowingEmpty` with Log in + Browse channels |
| Loading | Story-rail skeleton + two `HomeRailSkeleton`s, same box model as the real thing |
| Failed | Error panel with Retry (refetches both queries) |
| No follows | `FollowingEmpty` with Browse channels + See who's live |
| Follows, no uploads | Rail + manage list + "None of the channels you follow has published a video yet" |

The signed-out and no-follows empty states are separate on purpose: they have
different fixes, and one shared "nothing here" panel would send half the people
who see it to the wrong place.

## Known gaps (deliberate)

- **No "unwatched" tracking.** See the ring section above. `watch_progress`
  exists (migration `0007`) and would be the place to build a real unseen marker
  if one is ever wanted.
- **Shelves cap at 8 channels.** Channels past the cap appear in the rail and
  the manage list but get no shelf.
- **No sort control on the manage list.** One order (live, then recently
  followed). A sort menu is a different feature from "show me my follows".
- **No feed feedback on shelf cards.** `allowFeedback` is `false` — "Don't
  recommend this channel" is meaningless on a channel's own shelf, where the
  honest control is Unfollow. Feedback given on the home page is still honoured.
