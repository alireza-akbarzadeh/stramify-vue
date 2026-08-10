// Seeds the vertical half of the `clips` table — the feed behind `/shorts`.
//
// Sources are Mixkit's free stock library (Mixkit Free License: free for
// commercial and personal use, no attribution required, redistribution as
// stock not permitted — we embed, we don't re-host). Every URL below was
// curl-verified live and returns `206 video/mp4` for a range request, which
// is what the player needs to seek. Every one is genuinely 9:16 (the 360p
// renditions are 360×640, checked against their poster frames), and every
// `durationSeconds` below was read out of the file's own `mvhd` atom rather
// than guessed.
//
// Titles and descriptions are ours, written to match what is actually on
// screen in each clip, and the creators are the channels already seeded by
// `seed-channels.mjs` so avatars, follow buttons and channel pages resolve.
//
// Run with: npm run db:seed:shorts (or npm run db:seed for every seed script)
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL ?? '', { max: 1 })

const video = (id) => `https://assets.mixkit.co/videos/${id}/${id}-360.mp4`
const poster = (id) => `https://assets.mixkit.co/videos/${id}/${id}-thumb-360-0.jpg`
const minutesAgo = (m) => new Date(Date.now() - m * 60 * 1000)

const shorts = [
  {
    source: 1238,
    id: 'short-neon-rig-test',
    title: 'Rig test before the set',
    creator: 'Neon_Drift',
    category: 'Music',
    description: 'One tube, one stand, and about forty minutes of moving it two inches at a time.',
    durationSeconds: 22,
    views: 48200,
    createdAt: minutesAgo(35)
  },
  {
    source: 1240,
    id: 'short-blue-room-take',
    title: 'One take in the blue room',
    creator: 'Neon_Drift',
    category: 'Music',
    description: 'No cuts. The floor was freezing and you can absolutely tell by the last eight bars.',
    durationSeconds: 27,
    views: 91300,
    createdAt: minutesAgo(140)
  },
  {
    source: 1237,
    id: 'short-red-colour-test',
    title: 'Colour test for the album shoot',
    creator: 'Audio_Ritual',
    category: 'Music',
    description: 'Single red gel, no fill. We ended up using this exact setup for the cover.',
    durationSeconds: 23,
    views: 27600,
    createdAt: minutesAgo(260)
  },
  {
    source: 1241,
    id: 'short-merch-jacket',
    title: 'The merch jacket under stage blue',
    creator: 'Audio_Ritual',
    category: 'Music',
    description: 'Hand-painted, one of twelve. Drops with the tour dates on Friday.',
    durationSeconds: 17,
    views: 15400,
    createdAt: minutesAgo(400)
  },
  {
    source: 1232,
    id: 'short-neon-tattoo',
    title: 'That tattoo I drew last spring',
    creator: 'Canvas_Queen',
    category: 'Creative',
    description: 'Three overlapping circles and a line. Took two hours to draw and four months to commit to.',
    durationSeconds: 12,
    views: 63800,
    createdAt: minutesAgo(90)
  },
  {
    source: 1196,
    id: 'short-green-ink',
    title: 'Green ink hitting water',
    creator: 'Canvas_Queen',
    category: 'Creative',
    description: 'Filmed at 120fps through the side of the tank. No dye, no thickener — just ink and patience.',
    durationSeconds: 12,
    views: 34100,
    createdAt: minutesAgo(320)
  },
  {
    source: 1192,
    id: 'short-pink-into-cyan',
    title: 'Pink into cyan, no edit',
    creator: 'Canvas_Queen',
    category: 'Creative',
    description: 'Straight off the card. The colour separation is the ink doing it, not the grade.',
    durationSeconds: 10,
    views: 12700,
    createdAt: minutesAgo(520)
  },
  {
    source: 1198,
    id: 'short-yellow-then-everything',
    title: 'Yellow first, then everything else',
    creator: 'Slow_Render',
    category: 'Creative',
    description: 'Ten seconds of a drop of purple deciding what to do with a tank of yellow.',
    durationSeconds: 13,
    views: 8900,
    createdAt: minutesAgo(610)
  },
  {
    source: 1203,
    id: 'short-prism-leak',
    title: 'Light leak through a prism',
    creator: 'Slow_Render',
    category: 'Creative',
    description: 'Prism taped to the front of the lens, window light, hand slowly rotating. That is the whole rig.',
    durationSeconds: 20,
    views: 21500,
    createdAt: minutesAgo(700)
  },
  {
    source: 1487,
    id: 'short-red-eyed-frog',
    title: 'Macro on a red-eyed frog, handheld',
    creator: 'Slow_Render',
    category: 'Creative',
    description: 'Focus was manual and my hands were not steady. He blinked once in twelve seconds and I got it.',
    durationSeconds: 13,
    views: 118400,
    createdAt: minutesAgo(55)
  },
  {
    source: 1164,
    id: 'short-swell-golden-hour',
    title: 'Swell at golden hour',
    creator: 'Sky_High',
    category: 'Creative',
    description: 'Twenty metres up, straight down. The water was doing this for about four minutes and then it stopped.',
    durationSeconds: 21,
    views: 76200,
    createdAt: minutesAgo(180)
  },
  {
    source: 1259,
    id: 'short-palms-in-the-lenses',
    title: 'Palms in the lenses',
    creator: 'Sky_High',
    category: 'Creative',
    description: 'Shot the reflection instead of the thing. Works more often than it has any right to.',
    durationSeconds: 15,
    views: 42900,
    createdAt: minutesAgo(240)
  },
  {
    source: 1261,
    id: 'short-nowhere-to-be',
    title: 'Ninety-two degrees and nowhere to be',
    creator: 'Sky_High',
    category: 'Creative',
    description: 'Phone on a towel, timer, feet. The tile pattern underwater is the only thing in focus and that is fine.',
    durationSeconds: 24,
    views: 9600,
    createdAt: minutesAgo(830)
  },
  {
    source: 39765,
    id: 'short-first-marshmallow',
    title: 'First marshmallow of the trip',
    creator: 'First_Take',
    category: 'Creative',
    description: 'She waited about nine seconds for it to cool, which is eight more than I expected.',
    durationSeconds: 8,
    views: 203100,
    createdAt: minutesAgo(20)
  },
  {
    source: 39767,
    id: 'short-walk-back-to-camp',
    title: 'The walk back to camp',
    creator: 'First_Take',
    category: 'Creative',
    description: 'Last light on the fire road. Nobody said anything for the whole ten minutes.',
    durationSeconds: 10,
    views: 57400,
    createdAt: minutesAgo(480)
  }
]

for (const short of shorts) {
  await sql`
    insert into clips (
      id, title, creator, category, description, orientation, video_url,
      thumbnail_url, duration_seconds, views, featured, created_at
    ) values (
      ${short.id}, ${short.title}, ${short.creator}, ${short.category},
      ${short.description}, 'vertical', ${video(short.source)},
      ${poster(short.source)}, ${short.durationSeconds}, ${short.views}, false,
      ${short.createdAt}
    )
    on conflict (id) do update set
      title = excluded.title,
      creator = excluded.creator,
      category = excluded.category,
      description = excluded.description,
      orientation = excluded.orientation,
      video_url = excluded.video_url,
      thumbnail_url = excluded.thumbnail_url,
      duration_seconds = excluded.duration_seconds,
      views = excluded.views,
      created_at = excluded.created_at
  `
}

console.log(`Seeded ${shorts.length} shorts.`)
await sql.end()
