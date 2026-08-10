/** Where a bare letter is text the viewer is typing, not a shortcut. */
const TYPING_TARGET = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

/**
 * Whether a single-key shortcut should stand down for this event.
 *
 * Two cases, both of which turn a shortcut into a bug: the key is part of a
 * browser or OS chord (`⌘K`, `Ctrl+L`), or the viewer is typing into a field —
 * this app has a comment composer and a live-chat box, and swallowing letters
 * mid-word is worse than having no shortcut at all.
 *
 * Shared by every surface that binds bare keys (`t` on the watch page, the
 * arrow/space/`m` set on the shorts reel) so they can't disagree about what
 * counts as typing.
 */
export function isShortcutBlocked(event: KeyboardEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) return true
  return !!(event.target as Element | null)?.closest?.(TYPING_TARGET)
}
