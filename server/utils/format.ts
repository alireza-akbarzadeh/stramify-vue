// `formatCount` and `formatDuration` both live in `shared/utils/format.ts`
// because the browser needs them too — the watch page re-formats a count
// client-side after an optimistic like, and Creator Studio's upload wizard
// formats a duration it read off a `<video>` element before the server has
// ever seen the file. Neither is re-exported here: Nuxt auto-imports
// `shared/utils`, so server code calls them bare, and re-exporting would give
// the same name two sources and make the resolution a coin toss.

/**
 * How long a live session has been running, e.g. `"9m"`, `"3h 17m"`.
 * Unlike `formatAge` this never says "ago" — it's an uptime, and it stays
 * minute-precise past the hour because live viewers read it xxas "how much
 * have I missed".
 */
export function formatUptime(startedAt: Date): string {
  const minutes = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 60_000))
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export function formatAge(createdAt: Date): string {
  const diffMs = Date.now() - createdAt.getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'Now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
