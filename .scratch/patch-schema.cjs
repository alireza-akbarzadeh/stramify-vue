const fs = require('fs')
const p = 'server/db/schema/ads.ts'
let s = fs.readFileSync(p, 'utf8')
const crlf = s.includes('\r\n')
s = s.replace(/\r\n/g, '\n')

const old = "    durationSeconds: integer('duration_seconds').notNull(),\n"
if (!s.includes(old)) throw new Error('duration column anchor missing')
s = s.replace(old, '')

s = s.replace(
  ' * `skipAfterSeconds` is nullable and that nullability is load-bearing:',
  [
    ' * There is deliberately **no `duration` column**. It was here, and it was wrong',
    ' * within a day: the seeded values said 30s/15s/6s while the actual creatives',
    ' * were 5.1s, 6.2s and 300s. A duration is a fact about the video file, so a',
    ' * copy of it in the database is a second source of truth that drifts the',
    ' * moment anyone swaps a URL — and it drifts silently, because nothing fails,',
    ' * the countdown just lies. The player reports the real duration at runtime.',
    ' *',
    ' * `skipAfterSeconds` is nullable and that nullability is load-bearing:'
  ].join('\n')
)

if (crlf) s = s.replace(/\n/g, '\r\n')
fs.writeFileSync(p, s)
console.log('patched ok')
