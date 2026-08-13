// `formatCount` lives in `shared/` because the watch page's like button
// re-formats counts client-side after an optimistic update. Re-exported here
// so every existing server import keeps working unchanged. Imported by
// relative path, not the `#shared` alias, because `format.spec.ts` runs in
// the plain vitest environment where Nuxt's aliases aren't applied.

// `formatDuration` moved to `shared/` for the same reason and on the same
// terms — see the note on it there.
export { formatDuration } from '../../shared/utils/format'

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
