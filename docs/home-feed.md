# Home feed

`/` — the app's front door. A category chip bar, the channels you follow, and
a ranked recommendation grid across every clip and live session.

See [ADR-020](./DECISIONS.md) for why the marketing page moved to `/marketing`
and why the ranking is an explicit formula rather than a stored table.

## What a viewer gets

| | Signed out | Signed in |
|---|---|---|
| Chip bar | All · Live · one per non-empty category | same |
| Subscriptions rail | not rendered | "Latest from channels you follow", if any |
| Recommended grid | popularity + freshness | + a boost for channels you follow |
| Search | app bar (`AppSearch`) — same on every page | same |

Search is **not** part of this page. It lives in `DashboardTopBar`, which the
`dashboard` layout puts above every product surface, so home doesn't grow a
second search box that behaves differently from the real one.

## Ranking

One expression, in `server/utils/home.ts` as `SCORE`:

```
  ln(1 + audience)                    -- views (clip) or viewers (live)
+ 1.5 · ln(1 + likes)                 -- from `reactions`
-       ln(1 + dislikes)
+ 3     if you follow the channel     -- from `follows`
+ 1.5   if it is live right now
+ 2 / (1 + age_in_days)               -- +2 today, +1 tomorrow, ~+0.3 after a week
```

Why it's shaped like that:

- **Both popularity terms are logged before they're added**, so a video with
  ten times the views of another is *ahead* of it, not ten places ahead. Same
  reasoning as `RANK_SCORE` in `server/utils/channels.ts`.
- **A like counts 1.5× a view** because pressing like is a deliberate act and a
  view is not. Dislikes subtract at 1× — enough to sink a badly received
  upload, not enough for a brigade to bury one.
- **The follow boost is +3**, which in log space is about the distance between
  a 1k-view video and a 20k-view one. A channel you subscribe to reliably
  outranks a comparable stranger, without the feed collapsing into a
  subscriptions page — that rail exists separately.
- **Live gets +1.5**, the same "now beats a recording" rule that search
  (`server/utils/search.ts`) and the up-next rail already follow.

**There is no watch history.** `view.post.ts` increments a counter; it does not
record who watched what. So there is no collaborative signal here and nothing
pretends otherwise — "recommended" means popularity + your follows + freshness.
When per-viewer view events land (Phase 12), `SCORE` is the one place to change.

## Data flow

```
app/pages/index.vue
└─ HomeView.vue                     owns the active chip
   ├─ HomeChipBar.vue               tablist, scrolls sideways, arrow-key roving
   ├─ HomeFollowingRail.vue         only when signed in AND the All chip is active
   └─ HomeVideoGrid.vue             loading / error / empty / results + Load more
      ├─ HomeVideoSkeleton.vue
      └─ HomeVideoCard.vue          thumbnail, avatar, title, meta, reason
```

| Composable | Endpoint | Notes |
|---|---|---|
| `useDiscoveryCategories` | `/api/discovery/categories` | already existed; builds the chips |
| `useHomeFeed(chip)` | `/api/home/feed` | `useInfiniteQuery`, chip is part of the key |
| `useFollowingFeed()` | `/api/home/following` | `enabled` only when the auth store has a session |

`buildHomeChips` derives the bar from the categories endpoint, which only
returns categories that have clips — so the bar can never offer a filter that
lands on an empty grid.

## Paging

`cursor` is an **offset**, not a keyset. The ranking is deterministic for a
given viewer (ties break on `id`) and the catalogue is small. A keyset cursor
over a computed score would have to send the score to the client, which pins
the ranking formula into the URL.

The query asks for `limit + 1` rows and returns `nextCursor: null` when it gets
fewer, so "is there more" costs no extra `count(*)`.

## Recommendation reasons

The server returns a `reason` of `'following' | 'live' | 'new' | null`, in that
precedence order — a followed channel wins even when the session is also live,
because that's why *this viewer* is seeing it. `null` means popularity alone,
and the card renders no line at all rather than dressing a view count up as a
personal recommendation.

The copy lives in `homeReasonLabel` (`shared/utils/home.ts`), off the wire, so
it can change without a version skew between a cached response and the client
rendering it.

## Common failure modes

- **Grid is empty for everyone.** The feed reads `clips` and `live_streams`
  directly — if both are empty, seed them: `npm run db:seed`.
- **No subscriptions rail while signed in.** Expected when you follow nobody.
  `npm run db:seed:follows` seeds follows, but only for seeded users; follow a
  channel from `/watch/…` or `/channel/…` to see your own.
- **Chips show only All and Live.** `/api/discovery/categories` returned
  nothing, which means `clips` is empty — see above.
- **A category chip 404s the request.** `/api/home/feed` validates `category`
  against the `clip_category` enum. Adding a category means a migration plus
  `CLIP_CATEGORIES` in `shared/utils/category.ts`; the endpoint derives its
  allowed set from that constant, so nothing else needs touching.
- **Ranking looks wrong after seeding.** Seeded rows share a `created_at`, so
  the recency term is near-identical across them and the order is essentially
  views + likes. That's the formula working, not a bug.
