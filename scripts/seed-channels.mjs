// Seeds the `channels` table — the identity half of a channel (display name,
// banner, avatar, tagline, bio). The countable half (followers, views, clip
// count, live-now) is never stored: it's derived at query time in
// `server/utils/channels.ts`, so there's nothing here to fall out of sync.
//
// Every handle below matches a `clips.creator` or `live_streams.streamer_name`
// value seeded by the other scripts, lowercased — that's the join key. A
// channel with no row here still renders from its derived stats alone, so this
// script is safe to re-run and safe to skip.
//
// Banners/avatars use the same picsum placeholder service the clip thumbnails
// already use: real, fetchable images, replaced by creator uploads (R2, Phase 9)
// once uploading exists.
// Run with: npm run db:seed:channels
import postgres from 'postgres'
import { requireEnv } from './require-env.mjs'

const sql = postgres(requireEnv('DATABASE_URL'), { max: 1 })

const banner = (seed) => `https://picsum.photos/seed/${seed}-banner/1920/480`
const avatar = (seed) => `https://picsum.photos/seed/${seed}-avatar/200/200`
const monthsAgo = (m) => new Date(Date.now() - m * 30 * 24 * 60 * 60 * 1000)

const channels = [
  {
    handle: 'echocollective',
    displayName: 'Echo Collective',
    tagline: 'Live recordings from the road, mixed straight off the desk.',
    bio: 'A four-piece that records everything and releases most of it.\n\nWe post full sets, unrehearsed encores, and the occasional soundcheck that turned into something. Every upload is from the desk feed — no overdubs, no fixes.',
    location: 'Tokyo, JP',
    websiteUrl: 'https://example.com/echocollective',
    verified: true,
    createdAt: monthsAgo(29)
  },
  {
    handle: 'canvas_queen',
    displayName: 'Canvas Queen',
    tagline: 'Illustration, inks and long finishing passes. Commissions open.',
    bio: 'Digital painting from blank canvas to final export, in real time.\n\nMostly cover work and character commissions. I narrate what I am doing and why, so the streams double as a very slow tutorial.',
    location: 'Lisbon, PT',
    websiteUrl: 'https://example.com/canvasqueen',
    verified: true,
    createdAt: monthsAgo(34)
  },
  {
    handle: 'viper_squadron',
    displayName: 'Viper Squadron',
    tagline: 'Ranked grinds, no backseating, drops enabled.',
    bio: 'Competitive FPS most nights. Ladder pushes, VOD reviews when the run goes badly, and a lot of talking through rotations.',
    location: 'Austin, TX',
    websiteUrl: null,
    verified: true,
    createdAt: monthsAgo(41)
  },
  {
    handle: 'patch_bay',
    displayName: 'Patch Bay',
    tagline: 'Modular from an empty rack. Every cable explained.',
    bio: 'No preset recall, no pre-built patches. Each stream starts with an empty rack and ends with something that either works or is instructive.\n\nPatch notes go in the pinned comment when I can remember what I did.',
    location: 'Berlin, DE',
    websiteUrl: 'https://example.com/patchbay',
    verified: false,
    createdAt: monthsAgo(22)
  },
  {
    handle: 'ghostoperator',
    displayName: 'Ghost Operator',
    tagline: 'Map knowledge over mechanics. Flanks that should not work.',
    bio: 'Tactical shooters, played patiently. Most clips here are thirty seconds of waiting followed by three seconds of payoff.',
    location: null,
    websiteUrl: null,
    verified: false,
    createdAt: monthsAgo(18)
  },
  {
    handle: 'audio_ritual',
    displayName: 'Audio Ritual',
    tagline: 'Late-night ambient. Slow pads, long reverbs, requests open.',
    bio: 'Ambient and drone sets that run until the room feels right. Requests stay open all night and I take most of them.',
    location: 'Reykjavík, IS',
    websiteUrl: null,
    verified: false,
    createdAt: monthsAgo(15)
  },
  {
    handle: 'neon_drift',
    displayName: 'Neon Drift',
    tagline: 'Mountain passes on repeat. Tire wear is a suggestion.',
    bio: 'Touge runs, time attack, and the occasional attempt at a clean lap. Wheel cam always on.',
    location: 'Nagano, JP',
    websiteUrl: null,
    verified: false,
    createdAt: monthsAgo(12)
  },
  {
    handle: 'the_briefing',
    displayName: 'The Briefing',
    tagline: 'Patch notes, read properly, so you do not have to.',
    bio: 'Weekly breakdowns of what actually changed, followed by an open Q&A. Long-form, low-drama.',
    location: 'Manchester, UK',
    websiteUrl: 'https://example.com/thebriefing',
    verified: false,
    createdAt: monthsAgo(9)
  },
  {
    handle: 'slow_render',
    displayName: 'Slow Render',
    tagline: 'Blender lighting passes. Low stakes, high chat.',
    bio: '3D scenes built slowly, mostly lighting and look development. The render bar is part of the entertainment.',
    location: null,
    websiteUrl: null,
    verified: false,
    createdAt: monthsAgo(7)
  },
  {
    handle: 'subaru_nomad',
    displayName: 'Subaru Nomad',
    tagline: 'Rally stages, gravel to street, without lifting off.',
    bio: 'Sim rally with a real handbrake and questionable judgement. Gravel sections are where the runs die.',
    location: null,
    websiteUrl: null,
    verified: false,
    createdAt: monthsAgo(6)
  },
  {
    handle: 'sky_high',
    displayName: 'Sky High',
    tagline: 'Twenty minutes of setup for thirty seconds of light.',
    bio: 'Landscape and aerial work, mostly at the two hours of the day that matter.',
    location: 'Queenstown, NZ',
    websiteUrl: null,
    verified: false,
    createdAt: monthsAgo(4)
  },
  {
    handle: 'first_take',
    displayName: 'First Take',
    tagline: 'Tracking the EP live. Every take, including the bad ones.',
    bio: 'Recording an album in public. Vocal takes, comping, and the parts most people cut out of the video.',
    location: null,
    websiteUrl: null,
    verified: false,
    createdAt: monthsAgo(2)
  }
]

for (const channel of channels) {
  await sql`
    insert into channels (
      handle, display_name, tagline, bio, avatar_url, banner_url,
      website_url, location, verified, created_at
    ) values (
      ${channel.handle}, ${channel.displayName}, ${channel.tagline}, ${channel.bio},
      ${avatar(channel.handle)}, ${banner(channel.handle)},
      ${channel.websiteUrl}, ${channel.location}, ${channel.verified}, ${channel.createdAt}
    )
    on conflict (handle) do update set
      display_name = excluded.display_name,
      tagline = excluded.tagline,
      bio = excluded.bio,
      avatar_url = excluded.avatar_url,
      banner_url = excluded.banner_url,
      website_url = excluded.website_url,
      location = excluded.location,
      verified = excluded.verified,
      created_at = excluded.created_at
  `
}

console.log(`Seeded ${channels.length} channels.`)
await sql.end()
