# Dashboard

`/dashboard` (overview) and `/dashboard/analytics` (channel analytics). Both
sit inside `DashboardShell` — the sidebar shell — not the marketing
`AppHeader`/`AppFooter`. See [ADR-017](./DECISIONS.md) for the decisions
behind them.

## The one thing to understand first

**There is no link in the schema between a user and the content they
publish.** `clips.creator` and `live_streams.streamer_name` are free text and
there is no `clips.user_id` (ADR-014). The `channels` table (ADR-018) stores
identity only — display name, avatar, banner, bio, verified — keyed by
`handle`, with **no owner column** pointing back at `user`.

So the dashboard resolves your channel by **handle**: `user.name` matched
case-insensitively against `clips.creator` and `live_streams.streamer_name`.
That is the same identity model `readChannelSummary`, `follows.channel` and
`/api/discovery/live/[streamer]` already use — the dashboard didn't invent it
and doesn't need a migration.

**Practical consequence**: sign in as a user whose display name isn't a seeded
creator and you get the "nothing published under your handle yet" state on
both pages. That's correct, not a bug. To see a populated dashboard, sign in
as (or rename yourself to) a seeded handle — `Viper_Squadron` is one.

## What's real

Every number is an aggregation over a real table. Nothing is estimated.

| Panel | Source |
|---|---|
| Followers | `count(follows)` where `lower(channel) = lower(handle)` |
| Clips published / Total views | `clips` where `lower(creator) = lower(handle)` |
| Likes received | `reactions` on your clip ids, `kind='clip'`, `value='like'` |
| Comments received | `comments` on your clip ids |
| Your activity | `follows` / `reactions` / `comments` / `chat_messages` by `user_id` |
| Platform pulse | `live_streams` count + viewer sum, `clips` count, busiest category |
| Follower trend | daily `count` over `follows.created_at` |
| Engagement trend | daily `comments.created_at` + `reactions.created_at` on your clips |
| Top clips | `clips` by `views desc`, joined to per-clip like/comment counts |
| Category mix | `clips` grouped by `category` |

## What's deliberately absent

No watch time, no retention, no unique viewers, no views-over-time chart.
`clips.views` is a single integer counter — there is no session log to derive
any of those from. The analytics page states this in visible copy rather than
hiding it or inventing a plausible-looking line (CLAUDE.md §2). They arrive
with the Phase 9 creator system.

Platform "viewers watching" is a sum of seeded `viewer_count` values (ADR-013)
and is labelled `seeded` for that reason. It does not tick.

## API

Both routes require a session — `requireUser` 401s otherwise. The page
middleware (`auth`) is the UI half; this is the server half (CLAUDE.md §5).

| Route | Notes |
|---|---|
| `GET /api/dashboard/overview` | creator + viewer + platform in one round trip |
| `GET /api/dashboard/analytics` | `?range=7d\|30d\|90d`, Zod-validated, defaults `30d` |

`analytics` takes **no** `?channel=` parameter on purpose. The handle comes
from the session; a parameter would let any signed-in user read anyone else's
numbers, since no table records who owns a handle.

### Overlap with `server/utils/channels.ts` — read before extending

`selectChannelRows` (ADR-018) already computes followers, total views, clip
count, live status and categories for *any* handle in one CTE.
`readCreatorOverview` computes several of the same numbers separately, because
it also needs raw (unformatted) view totals and the clip-id list for the
likes/comments queries, which that CTE doesn't return.

That duplication is known and deliberate for now, not an oversight. If you
touch either, prefer widening the CTE to return raw totals and having the
dashboard read it, over adding a third place that counts followers.

## Component tree

```
app/pages/dashboard/index.vue        thin page
└─ DashboardShell (title/description) sidebar + sticky header
   └─ DashboardOverview.vue          container: query, loading/error
      ├─ DashboardWelcome
      ├─ PulseStrip → StatTile
      ├─ ChannelPanel → MetricTile
      ├─ ActivityPanel → MetricTile
      ├─ SecurityStatusCard
      └─ RoadmapCard

app/pages/dashboard/analytics.vue
└─ DashboardShell
   └─ AnalyticsView.vue              container: query, range state
      ├─ RangeTabs
      ├─ TrendChart ×2               followers, engagement
      ├─ TopClipsTable
      └─ CategoryMixBar
```

`DashboardSkeleton` and `DashboardError` are shared by both containers.

### Charts

`TrendChart.vue` is a hand-rolled SVG area+line — no charting dependency for
two paths. Notes that matter if you touch it:

- The gradient id comes from `useId()`. Two charts render on the analytics
  page; a hard-coded `<defs>` id would make the second one reuse the first's
  fill.
- `preserveAspectRatio="none"` stretches the viewBox to the container, and
  `vector-effect="non-scaling-stroke"` is what keeps the stroke from
  stretching with it. Remove one and you must remove the other.
- An all-zero window divides by a zero peak. The `peak === 0` branch pins
  every point to the baseline instead of producing `NaN` in the path.

### Filling the series

The database only returns days that had rows. `fillDailySeries`
(`shared/utils/trend.ts`) expands that into one point per day in the window —
otherwise a quiet week draws a straight line between two distant points and
reads like steady growth. It's pure and unit-tested (`trend.spec.ts`); the
endpoints don't each re-implement it.

## Running it

```bash
pnpm db:migrate && pnpm db:seed && pnpm dev
```

No new migration — the dashboard adds no tables. It reads what `0003_*`
already created.

## Failure modes

- **Everything says "nothing published under your handle"** — expected unless
  `user.name` matches a seeded `clips.creator` / `live_streams.streamer_name`.
  Rename the account or sign in as a seeded handle.
- **Overview 401s** — the session expired. Both endpoints are auth-only.
- **Charts are flat at zero** — real, and usually correct: `follows`,
  `comments` and `reactions` rows only exist from when those tables were
  seeded. A 90-day window over a freshly seeded database is mostly empty.
- **Category mix percentages don't total 100** — they should; `toPercentShares`
  gives the rounding remainder to the largest share. If they don't, that
  function regressed.
- **Analytics is slow on a large channel** — `selectChannelClipIds` pulls clip
  ids into memory and passes them to `inArray`. Fine at seed scale; a channel
  with thousands of clips wants a subquery or a join instead.

## Known limits

- Channel ownership is a name match. Rename yourself and your dashboard
  follows the new name — and your old content doesn't.
- `/dashboard/stream` is still a `ComingSoon` placeholder. Stream keys and
  RTMPS ingest are Phase 7; there is nothing real to show yet, so nothing is
  shown.
- Analytics covers clips only. A live session contributes `exists`/`isLive`
  but has no per-session metrics — those need the Phase 7 ingest pipeline to
  record anything in the first place.
