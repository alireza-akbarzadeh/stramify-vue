// Seeds `chat_messages` so a live watch page has backlog instead of an empty
// panel on first load. Real messages posted by signed-in viewers land in the
// same table through POST /api/watch/[slug]/chat (ADR-015) — these seeded rows
// have a null `user_id` and are indistinguishable in the UI, which is the
// point: chat is real, it just starts with history.
//
// Every `stream_id` below must exist: run `npm run db:seed:live` first (or
// `npm run db:seed`, which orders them correctly).
// Run with: npm run db:seed:chat
import postgres from 'postgres'
import { requireEnv } from './require-env.mjs'

const sql = postgres(requireEnv('DATABASE_URL'), { max: 1 })

const secondsAgo = (s) => new Date(Date.now() - s * 1000)

const messages = [
  ['chat-viper-1', 'live-viper-squadron', 'quickscope_kev', 'that flank was filthy', 260],
  ['chat-viper-2', 'live-viper-squadron', 'lumen_ghost', 'what sens are you running', 220],
  ['chat-viper-3', 'live-viper-squadron', 'Viper_Squadron', '800 dpi, 0.42 in game', 180],
  ['chat-viper-4', 'live-viper-squadron', 'static_bloom', 'promo run lets go', 120],
  ['chat-viper-5', 'live-viper-squadron', 'nine_lives', 'third game in a row, insane pace', 60],
  ['chat-viper-6', 'live-viper-squadron', 'crate_goblin', 'the corridor hold is so underrated', 25],
  ['chat-audio-1', 'live-audio-ritual', 'drift_and_decay', 'this pad is enormous', 300],
  ['chat-audio-2', 'live-audio-ritual', 'patchcable_pete', 'is that the new filter module?', 240],
  ['chat-audio-3', 'live-audio-ritual', 'Audio_Ritual', 'yeah, first time on stream', 200],
  ['chat-audio-4', 'live-audio-ritual', 'tape_hiss', 'immediately buying one', 90],
  ['chat-neon-1', 'live-neon-drift', 'midnight_lane', 'perfect driving music', 280],
  ['chat-neon-2', 'live-neon-drift', 'Neon_Drift', 'requests are open, drop them here', 210],
  ['chat-neon-3', 'live-neon-drift', 'sable_reverb', 'anything from the first set please', 140],
  ['chat-canvas-1', 'live-canvas-queen', 'kiln_and_ink', 'the line confidence is unreal', 320],
  ['chat-canvas-2', 'live-canvas-queen', 'Canvas_Queen', 'ten years of ruining paper', 250],
  ['chat-canvas-3', 'live-canvas-queen', 'hollow_frequency', 'genuinely inspiring to watch', 100]
]

for (const [id, streamId, authorName, body, ago] of messages) {
  await sql`
    insert into chat_messages (id, stream_id, user_id, author_name, body, created_at)
    values (${id}, ${streamId}, null, ${authorName}, ${body}, ${secondsAgo(ago)})
    on conflict (id) do update set
      stream_id = excluded.stream_id,
      author_name = excluded.author_name,
      body = excluded.body,
      created_at = excluded.created_at
  `
}

console.log(`Seeded ${messages.length} chat messages.`)
await sql.end()
