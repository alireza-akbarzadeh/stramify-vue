import type { Ref } from 'vue'

/**
 * Keeps a scroll container pinned to the bottom as items arrive — the live
 * chat behaviour everyone expects. Deliberately stops auto-scrolling once
 * the reader scrolls up to read backlog, and resumes when they return to
 * the bottom, so new messages never yank the view out from under them.
 */
export function useStickyScroll(el: Readonly<Ref<HTMLElement | null>>, count: () => number) {
  const pinned = ref(true)

  function onScroll() {
    const node = el.value
    if (!node) return
    // 24px of slack so a near-bottom position still counts as "at the bottom".
    pinned.value = node.scrollHeight - node.scrollTop - node.clientHeight < 24
  }

  function scrollToBottom() {
    const node = el.value
    if (node) node.scrollTop = node.scrollHeight
  }

  watch(count, async () => {
    if (!pinned.value) return
    await nextTick()
    scrollToBottom()
  })

  return { pinned, onScroll, scrollToBottom }
}
