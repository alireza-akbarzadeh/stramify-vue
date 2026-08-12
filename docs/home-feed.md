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
         └─ HomeVideoCardMenu.vue   the ⋮ — save, copy link, and feedback
```

`HomeVideoCard` is one `<article>` with a **stretched link**: the title anchor
carries `after:inset-0`, which spreads an invisible overlay across the card so
clicking anywhere opens the video. Before the menu existed the whole card *was*
the anchor — which makes every button inside it invalid HTML and swallows its
clicks. Anything interactive on the card therefore needs `relative z-10` to sit
above that overlay.

| Composable | Endpoint | Notes |
|---|---|---|
| `useDiscoveryCategories` | `/api/discovery/categories` | already existed; builds the chips |
| `useHomeFeed(chip)` | `/api/home/feed` | `useInfiniteQuery`, chip is part of the key |
| `useFollowingFeed()` | `/api/home/following` | `enabled` only when the auth store has a session |
| `useHomeFeedback()` | `/api/home/feedback` | one per list, not per card — see below |

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

## Negative feedback ("Not interested")

Every card's ⋮ menu offers two ways to push something out of the feed:

| Menu item | Stored as | Effect |
|---|---|---|
| Not interested | `{ kind: 'video', target: <video id> }` | that one video disappears |
| Don't recommend this channel | `{ kind: 'channel', target: <handle> }` | every video by that channel disappears |

Rows live in `feed_feedback` (`user_id`, `kind`, `target`), unique on all three
so pressing the same item twice is a no-op rather than a duplicate.

**The suppression happens in the ranking query, not after it.** `notSuppressed`
(`server/utils/feedback.ts`) is a correlated `not exists` folded into the
`where` of both `selectHomeFeed` and `selectFollowingFeed`. Filtering an
already-cut page instead would return short pages and repeat rows at the next
offset. Signed out the clause folds to `true`, so nothing changes for visitors.

The subscriptions rail is filtered too. Hiding a card from the grid while the
same video sits in the shelf above it reads as a broken button. The **follow
itself is untouched** — this is not unfollowing, and undo brings the shelf back.

Client side, `useHomeFeedback` is owned by the *list* (`HomeVideoGrid`,
`HomeFollowingRail`), not the card: twenty-four cards would otherwise each carry
a copy of the same cache-patching machinery. It removes the video from every
cached chip and from the rail optimistically, then confirms with a toast whose
**Undo** action `DELETE`s the row and invalidates both queries — the video has
to come back in its ranked position, and only the server knows where that is.

Signed out, the menu items are still there but say so: the endpoint is
`requireUser`, and hiding a card locally would be a preference that silently
evaporates on reload.

## Common failure modes

- **Grid is empty for everyone.** The feed reads `clips` and `live_streams`
  directly — if both are empty, seed them: `pnpm db:seed`.
- **No subscriptions rail while signed in.** Expected when you follow nobody.
  `pnpm db:seed:follows` seeds follows, but only for seeded users; follow a
  channel from `/watch/…` or `/channel/…` to see your own.
- **Chips show only All and Live.** `/api/discovery/categories` returned
  nothing, which means `clips` is empty — see above.
- **A category chip 404s the request.** `/api/home/feed` validates `category`
  against the `clip_category` enum. Adding a category means a migration plus
  `CLIP_CATEGORIES` in `shared/utils/category.ts`; the endpoint derives its
  allowed set from that constant, so nothing else needs touching.
- **The feed is missing videos you expect.** Check `feed_feedback` for that
  user — a "Don't recommend this channel" hides everything by that channel on
  this page. `delete from feed_feedback where user_id = '…'` clears it.
- **"Not interested" says "Log in to tune your recommendations".** Expected
  signed out; the suppression is a per-user row.
- **A hidden video comes back at the top.** It didn't — undo invalidates and
  refetches, so it returns wherever `SCORE` puts it, which may well be page 1.
- **Ranking looks wrong after seeding.** Seeded rows share a `created_at`, so
  the recency term is near-identical across them and the order is essentially
  views + likes. That's the formula working, not a bug.
