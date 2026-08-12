# Video streaming (clip + live-channel playback)

Covers playback: on-demand clips (`/clips`) and the live directory
(`/live`). **Broadcaster-facing live streaming — RTMPS ingest, stream keys,
Cloudflare Stream live inputs, per-channel `/live/[username]` pages, live
chat — is Phase 7 and not built yet** ([PROGRESS.md](./PROGRESS.md)). What
is real today is the viewer side: a database-backed directory of live
channels that plays genuine video.

## What it is

Both `/clips` and `/live` play real video through
[Vidstack](https://www.vidstack.io) (`vidstack@1.15.6`, MIT), backed by real
database tables (`clips`, `live_streams`). See
[DECISIONS.md](./DECISIONS.md) ADR-012 (clips) and ADR-013 (live) for why
Vidstack and why real tables instead of the fixtures discovery originally
shipped with.

## How it works

- **Data**: `server/db/schema/clips.ts` defines the `clips` table —
  `videoUrl` (directly playable mp4/HLS source), `thumbnailUrl`,
  `durationSeconds`, `views`, `category`, `featured`. `scripts/seed-clips.mjs`
  seeds it with freely-licensed public test videos (curl-verified live at
  seed time — see the script's header before adding more).
- **API**: `server/api/discovery/clips.get.ts` queries the table via
  Drizzle, formats display strings (`formatDuration`/`formatCount`/
  `formatAge` in `server/utils/format.ts`), and returns the same
  `{ featured, clips }` shape the frontend already expected.
- **Live data**: `server/db/schema/live-streams.ts` defines `live_streams`
  (`streamerName`, `title`, `category` — the same `clipCategoryEnum` —
  `videoUrl`, `thumbnailUrl`, `viewerCount`, `startedAt`).
  `server/api/discovery/live.get.ts` returns every row ordered by
  `viewerCount desc`, mapped through `toLiveSignal` in
  `server/utils/discovery.ts`: viewer counts via `formatCount`
  (`"8.4k watching"`) and uptime via `formatUptime` (`"3h 17m"`).
  `scripts/seed-live-streams.mjs` seeds it (see its header for the
  URL-sourcing rules).
- **Live UI**: `/live` (`app/pages/live.vue`) renders
  `app/components/discovery/LiveDirectory.vue` — search, category tabs
  (`app/utils/live.ts`'s `LIVE_CATEGORIES`/`filterLiveSignals`), skeleton /
  error / empty states — over `LiveChannelGrid.vue` + `LiveChannelCard.vue`
  (LiveBadge, viewer count, uptime). Clicking a card opens the same
  `ClipPlayerModal` used by clips, so live channels genuinely play. The
  "Live Signals" rail on `/clips` consumes the identical endpoint.
- **Player**: `app/plugins/vidstack.client.ts` registers Vidstack's custom
  elements client-side only (`vidstack/player`, `.../layouts/default`,
  `.../ui`). `nuxt.config.ts` loads the default theme CSS and sets
  `vue.compilerOptions.isCustomElement` so Vue leaves `media-*` tags as
  native DOM elements instead of trying to resolve them as components.
  `app/components/discovery/ClipPlayerModal.vue` renders
  `<media-player src="..." poster="...">` + `<media-provider>` +
  `<media-video-layout>` whenever the selected `WatchlistItem` has a
  `videoUrl`; live-signal items (no `videoUrl` yet) fall back to a static
  thumbnail with a "coming soon" badge.
- **Types**: `shared/types/vidstack.d.ts` does a type-only
  `import 'vidstack/vue'` so the `media-*` elements type-check in `.vue`
  templates (Vidstack ships this augmentation but it needs one import
  somewhere in the TS program to be picked up).

## How to run / modify

```bash
pnpm db:generate    # after changing a schema file under server/db/schema/
pnpm db:migrate     # apply to $DATABASE_URL
pnpm db:seed        # (re-)seed everything — safe to re-run, upserts by id
pnpm db:seed:clips  # clips only
pnpm db:seed:live   # live channels only (also resets their uptime clock)
```

To add a new sample clip, add a row to the `clips` array in
`scripts/seed-clips.mjs` and re-run `pnpm db:seed:clips` (same for
`scripts/seed-live-streams.mjs` / `db:seed:live`). To point at real
creator uploads once Cloudflare Stream (ADR-005) is configured, write
`videoUrl` as the Stream HLS manifest URL — no schema or component change
needed, the player treats it as an opaque playable source.

## Common failure modes

- **403 on a seeded video URL**: the public test-video host pulled the
  asset. `curl -I` the URL; if it's dead, swap it for another
  curl-verified source in `scripts/seed-clips.mjs` /
  `scripts/seed-live-streams.mjs` (see the ADR-012 note on
  `gtv-videos-bucket` — it died mid-project once already).
- **A live channel's uptime looks absurd ("47h 12m")**: seed data, not a
  bug — `started_at` is fixed at seed time and there's no ingest keeping it
  honest yet (Phase 7). Re-run `pnpm db:seed:live`.
- **`media-player` etc. show up as unknown-element warnings in the
  console**: `vidstack.client.ts` didn't register in time, or
  `isCustomElement` in `nuxt.config.ts` got reverted. Both are required.
- **TypeScript complains about `media-player` in a `.vue` template**:
  `shared/types/vidstack.d.ts` got deleted or excluded from the tsconfig.
- **Unmuted `autoplay` silently doesn't start**: expected — browsers block
  unmuted autoplay without sufficient user/media engagement. The player
  still renders paused with working controls; this isn't a bug to "fix"
  with a permanent mute default, since it degrades the primary "click a
  clip, hear it" experience for normal browser sessions.
