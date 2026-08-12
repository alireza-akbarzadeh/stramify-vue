// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import type { PlaylistItem } from '#shared/types/library'
import PlaylistItemRow from './PlaylistItemRow.vue'

const item: PlaylistItem = {
  id: 'clip-triple-kill',
  slug: 'clip-triple-kill',
  kind: 'clip',
  title: 'The Perfect Triple-Kill Flank',
  channel: 'GhostOperator',
  image: 'https://picsum.photos/seed/triple-kill/960/540',
  videoUrl: 'https://media.w3.org/2010/05/bunny/trailer.mp4',
  meta: '14.2k views · 2h ago',
  duration: '00:33',
  position: 2
}

/** `[move up, move down, remove]` — the owner-only cluster, in DOM order. */
function controls(wrapper: Awaited<ReturnType<typeof mountSuspended>>) {
  return wrapper.findAll('button')
}

describe('PlaylistItemRow', () => {
  it('renders the row and its number', async () => {
    const wrapper = await mountSuspended(PlaylistItemRow, { props: { item, index: 3 } })
    expect(wrapper.text()).toContain(item.title)
    expect(wrapper.text()).toContain('3')
  })

  it('shows no controls to a viewer who does not own the playlist', async () => {
    const wrapper = await mountSuspended(PlaylistItemRow, { props: { item, index: 1 } })
    expect(controls(wrapper)).toHaveLength(0)
  })

  it('gives the owner reorder and remove controls', async () => {
    const wrapper = await mountSuspended(PlaylistItemRow, {
      props: { item, index: 2, owner: true }
    })
    expect(controls(wrapper)).toHaveLength(3)
  })

  it('emits the direction it was asked to move', async () => {
    const wrapper = await mountSuspended(PlaylistItemRow, {
      props: { item, index: 2, owner: true }
    })
    const [up, down] = controls(wrapper)

    await up!.trigger('click')
    await down!.trigger('click')
    expect(wrapper.emitted('move')).toEqual([['up'], ['down']])
  })

  it('emits remove', async () => {
    const wrapper = await mountSuspended(PlaylistItemRow, {
      props: { item, index: 2, owner: true }
    })
    await controls(wrapper)[2]!.trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })

  // Disabled rather than hidden, so the cluster doesn't reflow as rows move.
  it('disables the up arrow on the first row and the down arrow on the last', async () => {
    const first = await mountSuspended(PlaylistItemRow, {
      props: { item, index: 1, owner: true, first: true }
    })
    expect(controls(first)[0]!.attributes('disabled')).toBeDefined()
    expect(controls(first)[1]!.attributes('disabled')).toBeUndefined()

    const last = await mountSuspended(PlaylistItemRow, {
      props: { item, index: 9, owner: true, last: true }
    })
    expect(controls(last)[0]!.attributes('disabled')).toBeUndefined()
    expect(controls(last)[1]!.attributes('disabled')).toBeDefined()
  })
})
