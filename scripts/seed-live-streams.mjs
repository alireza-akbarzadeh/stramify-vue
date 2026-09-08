// Seeds the `live_streams` table with real, freely-licensed sample videos so
// the `/live` directory lists genuinely playable channels before the RTMPS
// ingest pipeline exists (Phase 7 — see docs/DECISIONS.md ADR-013). Same
// sourcing rules as scripts/seed-clips.mjs: every URL below was curl-verified
// live (W3C's media.w3.org assets, MDN's CC0 set, Mux's public HLS test
// streams). Google's old gtv-videos-bucket set now 403s — don't reintroduce
// it. HLS sources are preferred here because that's what Cloudflare Stream
// live playback will hand us.
// Run with: npm run db:seed:live
import postgres from 'postgres'
import { requireEnv } from './require-env.mjs'

const sql = postgres(requireEnv('DATABASE_URL'), { max: 1 })

const placeholder = (seed) => `https://picsum.photos/seed/${seed}/960/540`
const minutesAgo = (m) => new Date(Date.now() - m * 60 * 1000)

const streams = [
  {
    id: 'live-viper-squadron',
    streamerName: 'Viper_Squadron',
    title: 'Ranked ladder push — top 500 or bust',
    category: 'Gaming',
    description: 'Grinding ranked until the promo hits. Drops enabled, no backseating.',
    videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    thumbnailUrl: placeholder('viper-squadron'),
    viewerCount: 8420,
    startedAt: minutesAgo(197)
  },
  {
    id: 'live-audio-ritual',
    streamerName: 'Audio_Ritual',
    title: 'Late-night ambient set, requests open',
    category: 'Music',
    description:
      'Slow pads, long reverbs, and whatever the chat talks me into. Requests open all night.',
    videoUrl: 'https://test-streams.mux.dev/pts_shift/master.m3u8',
    thumbnailUrl: placeholder('audio-ritual'),
    viewerCount: 2140,
    startedAt: minutesAgo(84)
  },
  {
    id: 'live-neon-drift',
    streamerName: 'Neon_Drift',
    title: 'Touge runs until the tires give up',
    category: 'Gaming',
    description: 'Mountain passes on repeat. Tire wear is a suggestion.',
    videoUrl: 'https://media.w3.org/2010/05/video/movie_300.mp4',
    thumbnailUrl: placeholder('neon-drift'),
    viewerCount: 1780,
    startedAt: minutesAgo(41)
  },
  {
    id: 'live-canvas-queen',
    streamerName: 'Canvas_Queen',
    title: 'Digital painting: finishing the cover commission',
    category: 'Creative',
    description:
      'Finishing the cover commission start to finish — inks, flats, and the final light pass.',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    thumbnailUrl: placeholder('canvas-queen-live'),
    viewerCount: 1260,
    startedAt: minutesAgo(312)
  },
  {
    id: 'live-patch-bay',
    streamerName: 'Patch_Bay',
    title: 'Modular jam — building a patch from scratch',
    category: 'Music',
    description: 'Empty rack to finished patch, no preset recall. Explaining every cable as I go.',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    thumbnailUrl: placeholder('patch-bay-live'),
    viewerCount: 964,
    startedAt: minutesAgo(23)
  },
  {
    id: 'live-the-briefing',
    streamerName: 'The_Briefing',
    title: 'Patch notes breakdown + community Q&A',
    category: 'Gaming',
    description:
      'Reading the patch notes so you do not have to, then answering whatever you throw at me.',
    videoUrl: 'https://stream.mux.com/v69RSHhFelSm4701snP22dYz2jICy4E4FUyk02rW4gxRM.m3u8',
    thumbnailUrl: placeholder('the-briefing'),
    viewerCount: 920,
    startedAt: minutesAgo(126)
  },
  {
    id: 'live-slow-render',
    streamerName: 'Slow_Render',
    title: 'Blender lighting pass, chill and chatty',
    category: 'Creative',
    description: 'Lighting pass on the new scene. Low stakes, high chat.',
    videoUrl: 'https://media.w3.org/2010/05/bunny/movie.mp4',
    thumbnailUrl: placeholder('slow-render'),
    viewerCount: 430,
    startedAt: minutesAgo(58)
  },
  {
    id: 'live-first-take',
    streamerName: 'First_Take',
    title: 'Tracking vocals for the new EP, live',
    category: 'Music',
    description: 'Tracking vocals for the EP live. Every take, including the bad ones.',
    videoUrl: 'https://test-streams.mux.dev/test_001/stream.m3u8',
    thumbnailUrl: placeholder('first-take'),
    viewerCount: 168,
    startedAt: minutesAgo(9)
  }
]

for (const stream of streams) {
  await sql`
    insert into live_streams (
      id, streamer_name, title, category, description, video_url, thumbnail_url,
      viewer_count, started_at
    ) values (
      ${stream.id}, ${stream.streamerName}, ${stream.title}, ${stream.category},
      ${stream.description}, ${stream.videoUrl}, ${stream.thumbnailUrl},
      ${stream.viewerCount}, ${stream.startedAt}
    )
    on conflict (id) do update set
      streamer_name = excluded.streamer_name,
      title = excluded.title,
      category = excluded.category,
      description = excluded.description,
      video_url = excluded.video_url,
      thumbnail_url = excluded.thumbnail_url,
      viewer_count = excluded.viewer_count,
      started_at = excluded.started_at
  `
}

console.log(`Seeded ${streams.length} live streams.`)
await sql.end()
