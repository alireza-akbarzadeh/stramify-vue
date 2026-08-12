# Channels

Channel pages (`/channel/[handle]`) and the ranked channel directory
(`/channels`). Decision record: [ADR-018](./DECISIONS.md), which narrows
[ADR-017](./DECISIONS.md) and builds on ADR-014's handle-as-identity model.

## What a channel is

A channel is a **handle**. Three tables reference one in free text:

| Column                      | Example           |
| --------------------------- | ----------------- |
| `clips.creator`             | `Canvas_Queen`    |
| `live_streams.streamer_name`| `Canvas_Queen`    |
| `follows.channel`           | `canvas_queen`    |

They agree case-insensitively, never by foreign key. `channels.handle` is the
canonical lowercase form and the URL segment; everything joins on `lower(...)`.
`shared/utils/channel.ts` is the single place that normalises a handle
(`toChannelHandle`), builds its path (`toChannelPath`) and renders it
(`toChannelTag` → `@canvas_queen`).

## Identity is stored; numbers are derived

`server/db/schema/channels.ts` holds **only** what a person authors: display
name, tagline, bio, avatar, banner, website, location, verified, created date.

Everything countable is computed per request — there is no follower counter or
view total on the row to fall out of sync. One CTE in
`server/utils/channels.ts` (`selectChannelRows`) aggregates:

- `clip_stats` — clip count, summed views, first/last publish, top thumbnail
- `live_stats` — live session count, summed viewers, current title
- `follow_stats` — follower count
- `my_follows` — whether *this* viewer follows (empty when signed out)
- `category_stats` — categories the channel actually publishes in
- `all_handles` — the union of clip creators, streamers and `channels` rows, so
  a channel exists as soon as it has *anything*

A handle with content but no `channels` row still renders: the display name
falls back to the creator's own casing with separators removed
(`Viper_Squadron` → "Viper Squadron"), and the avatar/banner fall back to the
deterministic gradient in `app/utils/channel.ts`.

## Ranking

`/channels` sorts in SQL, so `limit` is a real limit rather than a slice of an
already-fetched array. `ORDER_BY` in `server/utils/channels.ts`:

| Sort        | Order                                                        |
| ----------- | ------------------------------------------------------------ |
| `top`       | `2·ln(1+followers) + ln(1+views) + 1.5 if live`, then followers |
| `followers` | follower count, then views                                    |
| `views`     | summed clip views, then followers                             |
| `live`      | live channels first by viewers, then the `top` score          |
| `new`       | channel join date, falling back to first publish              |

Both `top` signals are logged so one runaway number can't own the ranking, and
followers weigh double because following is deliberate where a view is not.
Being live is a fixed nudge, not a multiplier. Verification buys nothing.

Filters: `?q=` (handle or display name, `ilike`), `?category=` (must be one of
the `clip_category` enum values), `?sort=`, `?limit=` — all Zod-validated in
`server/api/channels/index.get.ts`.

## Endpoints

| Route                              | Returns                                    |
| ---------------------------------- | ------------------------------------------ |
| `GET /api/channels`                | `ChannelListItem[]` — ranked directory     |
| `GET /api/channels/[name]`         | `ChannelSummary` — watch-page header only  |
| `GET /api/channels/[name]/profile` | `ChannelProfile` — the channel page header |
| `GET /api/channels/[name]/videos`  | `Clip[]` — `?sort=latest\|popular\|oldest` |
| `POST /api/channels/[name]/follow` | `ChannelSummary` — toggles, auth required  |

All reads work signed out; follow state is just `false` then. `profile` 404s
for a handle nothing is published under — the page renders that as a real
state. `videos` returning `[]` is valid (a channel that only ever goes live).

## Following, in three places at once

The same channel can be on screen as a watch-page header, a channel profile and
a directory card simultaneously. `useFollowChannel()`
(`app/composables/useChannel.ts`) is the only mutation; it patches all three
caches optimistically and rolls back by invalidating on error.

The patch is `±1` on a raw integer, which is why `followerCount` crosses the
wire raw while every other count is pre-formatted — the viewer is the only
actor who can change their own follow state, so the arithmetic is exact.
`useChannelFollow()` keys its query on the canonical handle, so the watch page
(`Canvas_Queen`) and the channel page (`canvas_queen`) share one cache entry
and cannot disagree about whether you follow.

## UI

`app/components/channel/`:

- `ChannelView.vue` — data wiring, tab routing, loading/404/error states
- `ChannelHero.vue` — banner, avatar, name, stats, follow/share, live ribbon
- `ChannelTabs.vue` — Home / Videos / Live / About, sticky under the header
- `ChannelHome.vue` — live card, latest-upload spotlight, most-watched grid
- `ChannelSpotlight.vue`, `ChannelLiveCard.vue`, `ChannelVideoGrid.vue`,
  `ChannelAbout.vue`, `ChannelSkeleton.vue`
- `ChannelDirectory.vue` + `ChannelDirectoryCard.vue` — `/channels`

The video grid reuses `discovery/ClipCard.vue` rather than growing a second
card for the same object. `ChannelAvatar.vue` sits at the top of
`app/components/` because the watch page, comments, chat, channel page and
directory all render the same identity.

The open tab lives in the URL (`?tab=about`, `app/composables/useChannelTab.ts`)
so a section is linkable, using `router.replace` so the back button leaves the
channel instead of walking back through every tab.

## Seeding

```bash
pnpm db:seed          # clips → live → channels → follows → comments → chat
```

Order matters: `channels` handles must match seeded creators/streamers, and
`follows` needs both channels and users.

`scripts/seed-follows.mjs` inserts **inert demo accounts** so the follower
ranking has real data. They have `demo-follower-` ids, `@demo.streamify.local`
emails, and **no `account` row**, so better-auth has no credential to check and
none of them can sign in by any method. Remove them with:

```sql
delete from "user" where id like 'demo-follower-%';
```

## Common failure modes

- **A channel 404s that should exist** — the handle has no clips, no live
  session and no `channels` row. Check `lower()` on both sides of the join;
  handles contain underscores, so never match them with `ilike` (`_` is a
  single-character wildcard in LIKE — that's why `readChannelProfile` uses
  `lower(...) = ...`).
- **Follower counts are all zero** — `pnpm db:seed:follows` hasn't run.
- **Follow button does nothing** — signed out. The UI toasts; the server
  returns 401 from `requireUser`.
- **Directory order looks wrong** — check `?sort=`; `top` is a blend, not
  follower order. `e2e/channel.spec.ts` asserts each order through the API.
