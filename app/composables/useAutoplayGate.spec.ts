// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { useShortsStore } from '@/stores/shorts'
import { useAutoplayGate } from './useAutoplayGate'

/**
 * A stand-in for the mute button.
 *
 * The gate listens on the document, so the thing worth testing is the *ordering*
 * between it and a control the viewer was actually aiming at — which needs a
 * real element, in a real document, dispatching a real bubbling click.
 */
const Harness = defineComponent({
  setup() {
    const shorts = useShortsStore()
    useAutoplayGate()
    return () => h('button', { onClick: () => shorts.toggleMuted() }, 'mute')
  }
})

const mounted: { unmount: () => void }[] = []

async function mount() {
  const wrapper = await mountSuspended(Harness, { attachTo: document.body })
  mounted.push(wrapper)
  return wrapper
}

describe('useAutoplayGate', () => {
  // The store outlives any one harness, and so would a listener from the last
  // test — `once` only fires it, it doesn't survive the unmount.
  beforeEach(() => {
    localStorage.clear()
    const shorts = useShortsStore()
    shorts.unblockAudio()
    if (shorts.muted) shorts.toggleMuted()
  })

  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it('gives sound back on the first gesture', async () => {
    await mount()
    const shorts = useShortsStore()
    shorts.blockAudio()

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(shorts.muted).toBe(false)
  })

  it('lets a press on the mute control turn sound on rather than racing it', async () => {
    const wrapper = await mount()
    const shorts = useShortsStore()
    shorts.blockAudio()

    // The regression this guards: bound on `pointerdown` the gate would clear
    // the block first, the button would then read an unmuted feed, and pressing
    // "unmute" would mute it. On `click` the element's own handler runs first.
    wrapper.find('button').element.click()

    expect(shorts.muted).toBe(false)
  })

  it('stands down once sound is the viewer’s explicit choice', async () => {
    const wrapper = await mount()
    const shorts = useShortsStore()

    // Muting deliberately, then lifting the block, must not un-mute it: the
    // gate only ever answers for the browser, never for the viewer.
    wrapper.find('button').element.click()
    expect(shorts.muted).toBe(true)

    shorts.unblockAudio()
    expect(shorts.muted).toBe(true)
  })
})
