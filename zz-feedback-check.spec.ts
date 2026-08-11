// Throwaway verification against the dev database. Deleted after running.
import { readFileSync } from 'node:fs'
import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

const env = readFileSync('.env', 'utf8')
for (const line of env.split(/\r?\n/)) {
  const match = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim())
  if (match) process.env[match[1]] ??= match[2].replace(/^["']|["']$/g, '')
}

const { db } = await import('./server/db/client')
const { selectHomeFeed, selectFollowingFeed } = await import('./server/utils/home')

describe('feed feedback against the real schema', () => {
  it('excludes what the viewer hid, and brings it back on undo', async () => {
    const users = await db.execute<{ id: string }>(sql`select id from "user" limit 1`)
    const userId = [...users][0]!.id

    const before = await selectHomeFeed({ userId })
    const victim = before.items[0]!
    console.log('BEFORE:', before.items.length, 'victim:', victim.id, '/', victim.channel)

    await db.execute(sql`
      insert into feed_feedback (id, user_id, kind, target)
      values ('zz-check-video', ${userId}, 'video', ${victim.id})
      on conflict do nothing
    `)
    const after = await selectHomeFeed({ userId })
    console.log('AFTER video feedback:', after.items.length)
    expect(after.items.some((item) => item.id === victim.id)).toBe(false)
    expect(after.items.length).toBeGreaterThan(0)

    await db.execute(sql`
      insert into feed_feedback (id, user_id, kind, target)
      values ('zz-check-channel', ${userId}, 'channel', lower(${victim.channel}))
      on conflict do nothing
    `)
    const blocked = await selectHomeFeed({ userId })
    const rail = await selectFollowingFeed(userId)
    console.log('AFTER channel feedback:', blocked.items.length, 'rail:', rail.length)
    const gone = (items: { channel: string }[]) =>
      items.every((item) => item.channel.toLowerCase() !== victim.channel.toLowerCase())
    expect(gone(blocked.items)).toBe(true)
    expect(gone(rail)).toBe(true)

    // Someone else's feed is untouched by this user's feedback.
    const anonymous = await selectHomeFeed({ userId: null })
    expect(anonymous.items.some((item) => item.id === victim.id)).toBe(true)

    await db.execute(
      sql`delete from feed_feedback where id in ('zz-check-video', 'zz-check-channel')`
    )
    const restored = await selectHomeFeed({ userId })
    console.log('AFTER undo:', restored.items.length)
    expect(restored.items.some((item) => item.id === victim.id)).toBe(true)
  })
})
