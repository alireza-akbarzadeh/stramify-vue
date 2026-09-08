// Seeds follower data so the channel directory's "most followers" ranking has
// something real to rank.
//
// WHY THERE ARE USER ROWS IN HERE: `follows.user_id` is a real foreign key to
// `user`, so followers can't exist without accounts. These demo accounts are
// deliberately inert:
//   - emails end in `@demo.streamify.local`, a reserved TLD with no real inbox,
//   - no `account` row is created, so better-auth has no credential to check
//     and none of them can sign in by any method,
//   - ids are prefixed `demo-follower-`, so they're trivially identifiable and
//     deletable (`delete from "user" where id like 'demo-follower-%'`).
// They are dev seed data, the same category as the seeded clips and streams —
// nothing in the app treats them specially, and no production code path invents
// a follower.
//
// Requires the channels/clips/live seeds to have run first (handles must match).
// Run with: npm run db:seed:follows
import postgres from 'postgres'
import { requireEnv } from './require-env.mjs'

const sql = postgres(requireEnv('DATABASE_URL'), { max: 1 })

const DEMO_USERS = 120

/**
 * Followers per channel. Nested subsets of the same demo audience (the first
 * `n` accounts follow each channel), which is roughly how real overlap looks:
 * the most-followed channel shares most of its audience with the rest.
 */
const followerCounts = {
  canvas_queen: 96,
  viper_squadron: 88,
  echocollective: 74,
  patch_bay: 61,
  ghostoperator: 47,
  audio_ritual: 38,
  neon_drift: 29,
  the_briefing: 21,
  slow_render: 14,
  subaru_nomad: 11,
  sky_high: 7,
  first_take: 4
}

const pad = (n) => String(n).padStart(3, '0')
const userId = (n) => `demo-follower-${pad(n)}`

for (let n = 1; n <= DEMO_USERS; n += 1) {
  await sql`
    insert into "user" (id, name, email, email_verified, image, created_at, updated_at)
    values (
      ${userId(n)}, ${`Demo Viewer ${pad(n)}`}, ${`viewer-${pad(n)}@demo.streamify.local`},
      false, null, now(), now()
    )
    on conflict (id) do nothing
  `
}

let total = 0
for (const [handle, count] of Object.entries(followerCounts)) {
  for (let n = 1; n <= count; n += 1) {
    await sql`
      insert into follows (id, user_id, channel, created_at)
      values (${`follow-demo-${handle}-${pad(n)}`}, ${userId(n)}, ${handle}, now())
      on conflict (user_id, channel) do nothing
    `
    total += 1
  }
}

console.log(`Seeded ${DEMO_USERS} demo viewers and ${total} follows.`)
await sql.end()
