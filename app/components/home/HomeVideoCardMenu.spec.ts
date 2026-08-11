// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import HomeVideoCardMenu from './HomeVideoCardMenu.vue'
import type { HomeVideo } from '#shared/types/home'

function video(overrides: Partial<HomeVideo> = {}): HomeVideo {
  return {
    id: 'clip-midnight-echo',
    slug: 'clip-midnight-echo',
    kind: 'clip',
    title: 'Midnight Echo',
    channel: 'Nova_Beats',
    category: 'Music',
    image: 'https://picsum.photos/seed/echo/960/540',
    videoUrl: 'https://example.test/echo.mp4',
    meta: '12.4k views · 3h ago',
    avatarUrl: null,
    reason: null,
    ...overrides
  }
}

let wrapper: Awaited<ReturnType<typeof mountSuspended>> | null = null

/**
 * Reka portals the panel to `document.body`, so the items are outside the
 * wrapper's tree — `item()` below reads the document, not `wrapper`. That also
 * means an open menu outlives its test unless it's torn down, which is what the
 * `afterEach` is for: otherwise the next test clicks the previous test's menu.
 *
 * Opened from the keyboard rather than with a pointer press: happy-dom's
 * synthetic pointer events don't carry the button/modifier fields Reka's
 * trigger checks, and Enter exercises a path that has to work anyway.
 */
async function open(saved = false) {
  wrapper = await mountSuspended(HomeVideoCardMenu, {
    props: { video: video(), saved },
    attachTo: document.body
  })
  await wrapper.find('[aria-haspopup="menu"]').trigger('keydown', { key: 'Enter' })
  await new Promise((resolve) => setTimeout(resolve, 0))
  return wrapper
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

function item(label: string): HTMLElement {
  const found = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((element) =>
    element.textContent?.includes(label)
  )
  if (!found) throw new Error(`No menu item matching "${label}"`)
  return found
}

describe('HomeVideoCardMenu', () => {
  it('opens with save, copy link and both feedback actions', async () => {
    await open()
    expect(item('Save to watchlist')).toBeTruthy()
    expect(item('Copy link')).toBeTruthy()
    expect(item('Not interested')).toBeTruthy()
    expect(item("Don't recommend this channel")).toBeTruthy()
  })

  it('offers to un-save a video that is already saved', async () => {
    await open(true)
    expect(item('Remove from watchlist')).toBeTruthy()
    expect(() => item('Save to watchlist')).toThrow()
  })

  it('emits video feedback for "Not interested"', async () => {
    const menu = await open()
    item('Not interested').click()
    await nextTick()
    expect(menu.emitted('feedback')?.[0]).toEqual([{ kind: 'video', target: 'clip-midnight-echo' }])
  })

  it('emits channel feedback naming the creator, not the video', async () => {
    const menu = await open()
    item("Don't recommend this channel").click()
    await nextTick()
    expect(menu.emitted('feedback')?.[0]).toEqual([{ kind: 'channel', target: 'Nova_Beats' }])
  })

  it('emits toggle-save rather than reaching for the watchlist itself', async () => {
    const menu = await open()
    item('Save to watchlist').click()
    await nextTick()
    expect(menu.emitted('toggle-save')).toHaveLength(1)
  })
})
