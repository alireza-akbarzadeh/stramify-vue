// Seeds the `clips` table with real, freely-licensed sample videos (W3C's
// long-standing media test assets, MDN's CC0 video set, and Mux's public
// HLS test streams) so the discovery feed has genuinely playable content
// before creator uploads exist. Every URL below was curl-verified live —
// Google's old gtv-videos-bucket sample set (a common tutorial choice) now
// 403s, so don't reintroduce it without re-checking.
// Run with: npm run db:seed:clips (or npm run db:seed for every seed script)
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL ?? '', { max: 1 })

const placeholder = (seed) => `https://picsum.photos/seed/${seed}/960/540`
const hoursAgo = (h) => new Date(Date.now() - h * 60 * 60 * 1000)

const clips = [
  {
    id: 'clip-midnight-echo',
    title: 'The Midnight Echo: Unrehearsed Encore at Tokyo Dome',
    creator: 'EchoCollective',
    category: 'Music',
    description:
      'The encore nobody expected. Three songs, no setlist, one take — recorded on the final night of the Tokyo Dome run.\n\nShot on four handhelds and mixed from the desk feed. The full set drops next week.',
    // Mux's public HLS test stream (adaptive bitrate) — shows off the
    // player's HLS support on the flagship featured clip.
    videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    thumbnailUrl: placeholder('midnight-echo'),
    durationSeconds: 165,
    views: 12400,
    featured: true,
    createdAt: hoursAgo(0)
  },
  {
    id: 'clip-triple-kill',
    title: 'The Perfect Triple-Kill Flank',
    creator: 'GhostOperator',
    category: 'Gaming',
    description:
      'Rotated wide, held the corridor nobody checks, and collected three before the smoke cleared.\n\nNo comms, no setup — just map knowledge and a very patient thirty seconds.',
    videoUrl: 'https://media.w3.org/2010/05/bunny/trailer.mp4',
    thumbnailUrl: placeholder('triple-kill'),
    durationSeconds: 33,
    views: 14200,
    featured: false,
    createdAt: hoursAgo(2)
  },
  {
    id: 'clip-modular-synthesis',
    title: 'Modular Synthesis Peak Moment',
    creator: 'Patch_Bay',
    category: 'Music',
    description:
      'Sixty seconds of a patch finally clicking into place. The filter sweep at the end was not planned.\n\nPatch notes in the pinned comment once I can remember what I did.',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    thumbnailUrl: placeholder('modular-synthesis'),
    durationSeconds: 60,
    views: 8900,
    featured: false,
    createdAt: hoursAgo(4)
  },
  {
    id: 'clip-rendering',
    title: 'Rendering the Final Details',
    creator: 'Canvas_Queen',
    category: 'Creative',
    description:
      'The last pass before export: rim light, dust, and the tiny grain that makes the whole frame sit right.\n\nEverything here is done at 200% zoom with a two-pixel brush. The rim light goes on a separate additive layer so it can be dialled back after the grain lands — bake it in early and you lose the only control that matters.\n\nRendered at 4K, graded, then downsampled. Full timelapse and the layer stack are on the channel.',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    thumbnailUrl: placeholder('rendering-details'),
    durationSeconds: 52,
    views: 22100,
    featured: false,
    createdAt: hoursAgo(1)
  },
  {
    id: 'clip-golden-hour',
    title: 'Chasing the Golden Hour Light',
    creator: 'Sky_High',
    category: 'Creative',
    description:
      'Twenty minutes of setup for thirty seconds of light. Worth it every single time.\n\nShot on a 70-200 at f/2.8, ISO locked to 100, exposing for the highlights and lifting the shadows afterwards. The haze is real — no filter, just a lot of patience and a very cold morning.',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    thumbnailUrl: placeholder('golden-hour'),
    durationSeconds: 30,
    views: 1500,
    featured: false,
    createdAt: hoursAgo(5)
  },
  {
    id: 'clip-street-run',
    title: 'Dirt to Street in Under a Minute',
    creator: 'Subaru_Nomad',
    category: 'Gaming',
    description:
      'Full stage transition without lifting off. The gravel section is where most runs die — this one held.',
    videoUrl: 'https://media.w3.org/2010/05/video/movie_300.mp4',
    thumbnailUrl: placeholder('street-run'),
    durationSeconds: 60,
    views: 6300,
    featured: false,
    createdAt: hoursAgo(8)
  },
  {
    id: 'clip-steel-forge',
    title: 'Forging the Final Cut',
    creator: 'Canvas_Queen',
    category: 'Creative',
    description:
      'No undo, no hesitation. Ten years of ruining paper condensed into thirty seconds.\n\nThe brush is a size 4 round that has lost about half its bristles, which is exactly why it works. Ink is standard waterproof black, thinned maybe five percent.',
    videoUrl: 'https://test-streams.mux.dev/pts_shift/master.m3u8',
    thumbnailUrl: placeholder('steel-forge'),
    durationSeconds: 30,
    views: 9700,
    featured: false,
    createdAt: hoursAgo(12)
  },

  // ---------------------------------------------------------------------
  // Music catalogue for `/music`.
  //
  // That page derives four shelves from these rows — recency, views, duration
  // and the viewer's follows — and drops any derived shelf under three items
  // (see `MUSIC_MIN_SHELF_ITEMS`), so two Music clips produced a page with one
  // rail on it. These fill the shelves out with a spread of view counts,
  // durations and ages so each ordering is visibly different from the others
  // rather than the same rail relabelled.
  //
  // **Progressive mp4 only, on purpose.** `/music` previews a track on hover
  // through a bare `<video>`, which plays HLS natively in Safari and nowhere
  // else (see `app/utils/preview.ts`) — an all-HLS catalogue would show the
  // still-image fallback on every card in Chrome and look like the feature was
  // broken. The two HLS rows above stay HLS so the real player keeps exercising
  // that path on `/watch`.
  //
  // Sources are reused from the verified set at the top of this file rather
  // than new URLs: these are fixture stand-ins for artwork nobody has uploaded
  // yet, and a fixture that 404s is worse than one that repeats.
  // ---------------------------------------------------------------------
  {
    id: 'clip-neon-district',
    title: 'Neon District — Full Rooftop Set',
    creator: 'EchoCollective',
    category: 'Music',
    description:
      'Ninety minutes condensed into the part everyone asks about: the transition at the top of the second hour, when the rain started and nobody left.\n\nRecorded live off the desk. Unmastered.',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    thumbnailUrl: placeholder('neon-district'),
    durationSeconds: 312,
    views: 48300,
    featured: false,
    createdAt: hoursAgo(20)
  },
  {
    id: 'clip-analog-drift',
    title: 'Analog Drift (Live Takes, No Overdubs)',
    creator: 'Patch_Bay',
    category: 'Music',
    description:
      'One take, two hands, no overdubs and no click. The drift you can hear around the two-minute mark is the oscillator warming up — it settles on its own and I stopped trying to fix it.',
    videoUrl: 'https://media.w3.org/2010/05/video/movie_300.mp4',
    thumbnailUrl: placeholder('analog-drift'),
    durationSeconds: 186,
    views: 27600,
    featured: false,
    createdAt: hoursAgo(30)
  },
  {
    id: 'clip-basement-tape',
    title: 'The Basement Tape',
    creator: 'Nova_Beats',
    category: 'Music',
    description:
      'Recorded on a borrowed four-track in a room with genuinely terrible acoustics, which turned out to be the whole sound.\n\nNo plugins on this one. The reverb is the room.',
    videoUrl: 'https://media.w3.org/2010/05/bunny/trailer.mp4',
    thumbnailUrl: placeholder('basement-tape'),
    durationSeconds: 94,
    views: 15800,
    featured: false,
    createdAt: hoursAgo(44)
  },
  {
    id: 'clip-string-section',
    title: 'String Section, 6AM',
    creator: 'Nova_Beats',
    category: 'Music',
    description:
      'The quartet had been awake for nineteen hours and this is the take we kept.\n\nTwo mics, both further back than anyone recommends. You can hear the building.',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    thumbnailUrl: placeholder('string-section'),
    durationSeconds: 421,
    views: 6200,
    featured: false,
    createdAt: hoursAgo(52)
  },
  {
    id: 'clip-last-encore',
    title: 'Last Encore Before the Lights Came Up',
    creator: 'EchoCollective',
    category: 'Music',
    description:
      'The house lights were already on. They played anyway, and the crowd sang loud enough that the desk feed clipped.\n\nThis is the audience mic, not the board — it is the better recording.',
    videoUrl: 'https://media.w3.org/2010/05/video/movie_300.mp4',
    thumbnailUrl: placeholder('last-encore'),
    durationSeconds: 138,
    views: 33900,
    featured: false,
    createdAt: hoursAgo(70)
  }
]

for (const clip of clips) {
  await sql`
    insert into clips (
      id, title, creator, category, description, video_url, thumbnail_url,
      duration_seconds, views, featured, created_at
    ) values (
      ${clip.id}, ${clip.title}, ${clip.creator}, ${clip.category},
      ${clip.description}, ${clip.videoUrl}, ${clip.thumbnailUrl},
      ${clip.durationSeconds}, ${clip.views}, ${clip.featured}, ${clip.createdAt}
    )
    on conflict (id) do update set
      title = excluded.title,
      creator = excluded.creator,
      category = excluded.category,
      description = excluded.description,
      video_url = excluded.video_url,
      thumbnail_url = excluded.thumbnail_url,
      duration_seconds = excluded.duration_seconds,
      views = excluded.views,
      featured = excluded.featured,
      created_at = excluded.created_at
  `
}

console.log(`Seeded ${clips.length} clips.`)
await sql.end()
