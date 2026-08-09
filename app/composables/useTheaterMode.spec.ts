// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { useTheaterMode, useTheaterShortcut } from './useTheaterMode'

/**
 * Mirrors how the watch page wires this up: `WatchLayout` binds the shortcut
 * once and the flag is read wherever it's needed. The input is here because
 * the page really does have text fields (chat, comment composer) and the guard
 * against them is the part worth pinning down.
 */
const Harness = defineComponent({
  setup() {
    const { theater } = useTheaterMode()
    useTheaterShortcut()
    return () => h('div', [h('input'), h('span', String(theater.value))])
  }
})

function pressT(target: EventTarget = document.body, init: KeyboardEventInit = {}) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true, ...init }))
}

describe('useTheaterShortcut', () => {
  beforeEach(() => {
    useTheaterMode().theater.value = false
  })

  it('toggles theater mode on "t"', async () => {
    const wrapper = await mountSuspended(Harness, { attachTo: document.body })

    pressT()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toBe('true')

    pressT()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toBe('false')
  })

  it('ignores "t" typed into a text field', async () => {
    const wrapper = await mountSuspended(Harness, { attachTo: document.body })

    pressT(wrapper.find('input').element)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toBe('false')
  })

  it('ignores "t" pressed with a modifier, so browser shortcuts still work', async () => {
    const wrapper = await mountSuspended(Harness, { attachTo: document.body })

    pressT(document.body, { metaKey: true })
    pressT(document.body, { ctrlKey: true })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toBe('false')
  })
})

describe('useTheaterMode', () => {
  beforeEach(() => {
    useTheaterMode().theater.value = false
  })

  it('shares one flag across separate call sites', () => {
    const player = useTheaterMode()
    const layout = useTheaterMode()

    player.toggle()
    expect(layout.theater.value).toBe(true)
  })
})
