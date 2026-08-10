import { defineStore, skipHydrate } from 'pinia'

const MUTED_KEY = 'streamify.shorts.muted.v1'

/**
 * Player state for the vertical feed: which short is on screen, whether it's
 * playing, whether sound is on, and whether the comment sheet is open.
 *
 * A store rather than props because these four values are read and written by
 * components that sit in completely different branches of the tree — the slide
 * decides whether to play from `activeId`, the mute button and the action rail
 * live in an overlay above it, the comment sheet is portalled out of the page
 * entirely, and the keyboard handler is bound on the reel. Threading them
 * through would mean four props and four emits crossing five components to
 * express one screen's worth of state.
 *
 * Only client state lives here. The shorts themselves are server state and
 * belong to TanStack Query (`useShortsFeed`), per the split in CLAUDE.md.
 */
export const useShortsStore = defineStore('shorts', () => {
  /**
   * Sound is off until the viewer asks for it, and the choice is remembered.
   *
   * Not a stylistic default: browsers refuse to autoplay a video with sound
   * that the user hasn't interacted with, so an unmuted feed would simply
   * fail to start. `skipHydrate` + `initOnMounted` for the same reason as
   * `stores/watchlist` — the value persists itself, so Pinia must not restore
   * the server's default over it.
   */
  const muted = skipHydrate(useLocalStorage(MUTED_KEY, true, { initOnMounted: true }))

  const activeId = ref<string | null>(null)
  const paused = ref(false)
  const commentsFor = ref<string | null>(null)

  /**
   * Whether the viewer has taken hold of this short.
   *
   * Untouched, a short plays once and the feed moves on — that's the default
   * every vertical feed has, and it's what makes the page watchable without
   * touching anything. Tapping the video is a statement that you want *this*
   * one, so from then on it loops where it sits instead of scrolling away
   * from under you. Reset on every new short, because the intent was about
   * the one you tapped.
   */
  const held = ref(false)

  const commentsOpen = computed(() => commentsFor.value !== null)

  /**
   * Scrolling to a new short always resumes playback: a feed that stayed
   * paused because you paused the previous video reads as broken. Any open
   * comment sheet belongs to the short you just left, so it closes too.
   */
  function setActive(id: string | null) {
    if (activeId.value === id) return
    activeId.value = id
    paused.value = false
    held.value = false
    commentsFor.value = null
  }

  function toggleMuted() {
    muted.value = !muted.value
  }

  /** Tapping the video. Also the gesture that pins the feed to this short. */
  function togglePaused() {
    paused.value = !paused.value
    held.value = true
  }

  function openComments(id: string) {
    commentsFor.value = id
  }

  function closeComments() {
    commentsFor.value = null
  }

  return {
    muted,
    activeId,
    paused,
    held,
    commentsFor,
    commentsOpen,
    setActive,
    toggleMuted,
    togglePaused,
    openComments,
    closeComments
  }
})
