/**
 * Display formatters shared by both sides of the wire.
 *
 * `formatCount` started life in `server/utils/format.ts` (which still
 * re-exports it, so existing server imports are unchanged). It moved here
 * when the watch page needed it on the client: a like button updates its
 * count optimistically, so the browser has to re-format a number the server
 * never sent. Two implementations would have drifted.
 */

/**
 * Seconds → `"04:07"`. Lived in `server/utils/format.ts` until Creator Studio
 * needed it in the browser: the upload wizard reads a file's duration off a
 * `<video>` element and shows it before the server has ever seen the file.
 * Still re-exported from there, so the nine server call sites are unchanged.
 */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** `842` → `"842"`, `12400` → `"12.4k"`. */
export function formatCount(count: number): string {
  if (count < 1000) return String(count)
  return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`
}

/**
 * Relative time from an ISO string or Date, e.g. `"Now"`, `"12m ago"`,
 * `"3h ago"`, `"2d ago"`. The client-side twin of the server's `formatAge`,
 * used for chat lines that arrive as raw ISO timestamps.
 */
export function formatRelativeTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (minutes < 1) return 'Now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
