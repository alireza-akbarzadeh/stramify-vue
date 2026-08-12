import {defineStore, skipHydrate} from 'pinia'
import {toast} from 'vue-sonner'

// `.v2` because the default flipped from muted to unmuted, and because the old
// autoplay fallback wrote `true` into `.v1` on the first refusal — every viewer
// who ever loaded the old page has a `true` saved under that key, and reusing it
// would carry a silent feed forward past this change for exactly the people who
// have used the page most.
const MUTED_KEY = 'streamify.shorts.muted.v2'

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
     * The viewer's own choice about sound, remembered across visits.
     *
     * Sound is *on* by default. A short is a video with a soundtrack and
     * opening it silent is a worse default than the browser's own refusal —
     * which is a separate thing, tracked below, and not a preference.
     *
     * `skipHydrate` + `initOnMounted` for the same reason as
     * `stores/watchlist` — the value persists itself, so Pinia must not restore
     * the server's default over it.
     */
    const prefersMuted = skipHydrate(useLocalStorage(MUTED_KEY, false, {initOnMounted: true}))

    /**
     * The browser refused to play this feed with sound.
     *
     * Every browser blocks audible autoplay until the page has been interacted
     * with, and the only way through that refusal is to drop to silent playback
     * and start anyway — the alternative is a feed stranded on its poster. That
     * is the browser's decision rather than the viewer's, so it deliberately
     * does not persist and never touches `prefersMuted`; `useAutoplayGate`
     * clears it on the first gesture, which is the same moment the browser
     * starts allowing sound.
     */
    const autoplayBlocked = ref(false)

    /** Whether the short on screen is actually silent, for either reason. */
    const muted = computed(() => prefersMuted.value || autoplayBlocked.value)

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

    /**
     * Repeat-one: the short on screen loops instead of handing off to the next.
     *
     * Off by default — a feed that carries itself forward is the whole point of
     * the page, so auto-advance stays the behaviour you get without asking.
     *
     * Unlike `held`, this is a *mode* rather than a reaction to one short, which
     * is why `setActive` deliberately leaves it alone: the viewer switched it on
     * and only the viewer switches it off.
     */
    const repeat = ref(false)

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

    /**
     * Sound off/on, from the button and from `m`.
     *
     * Reads `muted` rather than `prefersMuted` so the control always does what
     * its icon says: a feed silenced by an autoplay block shows the muted icon,
     * and pressing it has to turn sound *on* — the press is itself the gesture
     * that lifts the block. Clearing the block here rather than leaving it to
     * `useAutoplayGate` is what makes that one press enough.
     */
    function toggleMuted() {
        const nextMuted = !muted.value
        prefersMuted.value = nextMuted
        autoplayBlocked.value = false
    }

    /** The browser refused audible playback — fall back to silent playback. */
    function blockAudio() {
        autoplayBlocked.value = true
    }

    /** A gesture landed, so audible playback is allowed again. */
    function unblockAudio() {
        autoplayBlocked.value = false
    }

    /** Tapping the video. Also the gesture that pins the feed to this short. */
    function togglePaused() {
        paused.value = !paused.value
        held.value = true
    }

    /**
     * The announcement lives here rather than on the button because the action
     * rail and the `r` shortcut both land on this, and a mode that flips
     * silently from the keyboard is a mode you can't tell is on. A fixed toast
     * id so mashing the key replaces the message instead of stacking six of them.
     */
    function toggleRepeat() {
        repeat.value = !repeat.value
        toast(
            repeat.value
                ? 'Repeat on — this short will keep looping'
                : 'Repeat off — playing the next short',
            {id: 'shorts-repeat'}
        )
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
        repeat,
        commentsFor,
        commentsOpen,
        setActive,
        toggleMuted,
        blockAudio,
        unblockAudio,
        togglePaused,
        toggleRepeat,
        openComments,
        closeComments
    }
})
