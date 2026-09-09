// Seeds the `ads` table with real, freely-licensed creatives so pre-roll is
// genuinely playable video rather than a mocked overlay (CLAUDE.md §2 — see
// docs/DECISIONS.md ADR-036). Same sourcing rules as scripts/seed-clips.mjs:
// every URL below was curl-verified live (MDN's CC0 set, W3C's media assets).
// Google's old gtv-videos-bucket set now 403s — don't reintroduce it.
//
// The three rows deliberately cover the three shapes the player has to handle:
// a standard skippable spot, a short unskippable bumper (`skip_after_seconds`
// null), and a longer spot with a later gate. A single seeded row would leave
// two of those paths untested by anything but a unit test.
//
// Run with: pnpm db:seed:ads
import postgres from 'postgres'
import { requireEnv } from './require-env.mjs'

const sql = postgres(requireEnv('DATABASE_URL'), { max: 1 })

const ads = [
  {
    id: 'ad-orbit-audio',
    advertiser: 'Orbit Audio',
    title: 'Studio monitors, built for small rooms',
    video_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    click_url: 'https://example.com/orbit-audio',
    duration_seconds: 30,
    skip_after_seconds: 5,
    weight: 3,
    active: true
  },
  {
    id: 'ad-northwind-cloud',
    advertiser: 'Northwind Cloud',
    title: 'Ship your stream in one command',
    video_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
    click_url: 'https://example.com/northwind-cloud',
    duration_seconds: 15,
    skip_after_seconds: 5,
    weight: 2,
    active: true
  },
  {
    // Unskippable on purpose: short enough that a skip button would be theatre.
    id: 'ad-lumen-bumper',
    advertiser: 'Lumen',
    title: 'Light that follows the beat',
    video_url: 'https://media.w3.org/2010/05/video/movie_300.mp4',
    click_url: 'https://example.com/lumen',
    duration_seconds: 6,
    skip_after_seconds: null,
    weight: 1,
    active: true
  }
]

for (const ad of ads) {
  await sql`
    insert into ads ${sql(ad)}
    on conflict (id) do update set
      advertiser = excluded.advertiser,
      title = excluded.title,
      video_url = excluded.video_url,
      click_url = excluded.click_url,
      duration_seconds = excluded.duration_seconds,
      skip_after_seconds = excluded.skip_after_seconds,
      weight = excluded.weight,
      active = excluded.active
  `
}

console.log(`seeded ${ads.length} ads`)
await sql.end()
