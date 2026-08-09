import { onKeyStroke } from '@vueuse/core'

/**
 * Theater mode: the player widens to the full content column and the sidebar
 * drops below the video's metadata instead of sitting beside it.
 *
 * The flag lives in `useState` rather than travelling as a prop because three
 * unrelated leaves read it — the player (its width), the control bar (the
 * toggle button) and `WatchLayout` (the grid) — and threading it through every
 * level in between would buy nothing. Being app-level state also means the
 * choice survives moving from one watch page to the next, which is what
 * viewers expect from the equivalent control on YouTube.
 */
export function useTheaterMode() {
  const theater = useState('watch:theater', () => false)
  return { theater, toggle: () => (theater.value = !theater.value) }
}

/** Where a bare letter is text the viewer is typing, not a shortcut. */
const TYPING_TARGET = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

/**
 * Binds `t` — the shortcut YouTube uses. Registered by `WatchLayout` so it
 * lives and dies with the watch page rather than leaking onto every route.
 *
 * The guard matters here specifically: this page has a live-chat box and a
 * comment composer, and toggling the layout out from under someone mid-word
 * would be worse than having no shortcut at all.
 */
export function useTheaterShortcut() {
  const { toggle } = useTheaterMode()

  onKeyStroke('t', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if ((event.target as Element | null)?.closest?.(TYPING_TARGET)) return
    event.preventDefault()
    toggle()
  })
}
