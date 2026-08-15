// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import StudioVideoList from './StudioVideoList.vue'
import type { StudioVideo } from '#shared/types/studio'

/**
 * The four states this component exists to keep distinct.
 *
 * `useStudioVideos` is stubbed rather than exercised: what's under test is the
 * branching, not TanStack Query. The two empty states in particular are the
 * reason for this file — "you haven't uploaded anything" and "nothing matches
 * those filters" look similar and are opposite dead ends if swapped.
 */
const state = {
  data: ref<StudioVideo[] | undefined>(undefined),
  isPending: ref(false),
  isError: ref(false)
}

vi.mock('@/composables/useStudioVideos', () => ({
  STUDIO_VIDEOS_KEY: ['studio', 'videos'],
  useStudioVideos: () => ({
    data: state.data,
    isPending: computed(() => state.isPending.value),
    isError: computed(() => state.isError.value),
    refetch: vi.fn()
  }),
  useDeleteStudioVideo: () => ({ mutateAsync: vi.fn(), isPending: ref(false) })
}))

function video(overrides: Partial<StudioVideo> = {}): StudioVideo {
  return {
    id: 'clip-a',
    title: 'Midnight Echo',
    description: 'A rooftop set',
    category: 'Music',
    visibility: 'public',
    orientation: 'landscape',
    thumbnailUrl: '/api/media/thumb/a.jpg',
    videoUrl: '/api/media/video/a.mp4',
    durationSeconds: 240,
    views: 1200,
    comments: 2,
    likes: 5,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides
  }
}

beforeEach(() => {
  state.data.value = undefined
  state.isPending.value = false
  state.isError.value = false
})

describe('StudioVideoList', () => {
  it('announces loading and reserves the rows it is about to draw', async () => {
    state.isPending.value = true
    const wrapper = await mountSuspended(StudioVideoList)

    expect(wrapper.find('[role="status"]').text()).toBe('Loading your videos')
    // Skeletons in the row's own geometry, so nothing jumps when data lands.
    expect(wrapper.findAll('[data-slot="skeleton"], .animate-pulse').length).toBeGreaterThan(0)
    expect(wrapper.find('ul').exists()).toBe(false)
  })

  it('offers a retry when the request failed, and does not claim the videos are gone', async () => {
    state.isError.value = true
    const wrapper = await mountSuspended(StudioVideoList)

    expect(wrapper.text()).toContain("We couldn't load your videos")
    expect(wrapper.text()).toContain('Your videos are safe')
    expect(wrapper.text()).toContain('Try again')
  })

  it('points a creator with no uploads at the uploader', async () => {
    state.data.value = []
    const wrapper = await mountSuspended(StudioVideoList)

    expect(wrapper.text()).toContain("You haven't uploaded anything yet")
    const cta = wrapper.findAll('a').find((a) => a.text().includes('Upload your first video'))
    expect(cta?.attributes('href')).toBe('/studio/upload')
    // The filter bar would be furniture with nothing to filter.
    expect(wrapper.find('input[type="search"]').exists()).toBe(false)
  })

  it('lists uploads with their visibility and counts once there are some', async () => {
    state.data.value = [video(), video({ id: 'clip-b', title: 'Alpha', visibility: 'private' })]
    const wrapper = await mountSuspended(StudioVideoList)

    expect(wrapper.findAll('li')).toHaveLength(2)
    expect(wrapper.text()).toContain('Midnight Echo')
    expect(wrapper.text()).toContain('Private')
    expect(wrapper.text()).toContain('1.2k views')
    expect(wrapper.find('input[type="search"]').exists()).toBe(true)
  })

  it('distinguishes "nothing matches" from "nothing uploaded", and offers to clear', async () => {
    state.data.value = [video()]
    const wrapper = await mountSuspended(StudioVideoList)

    await wrapper.find('input[type="search"]').setValue('nothing will match this')

    expect(wrapper.text()).toContain('Nothing matches those filters')
    expect(wrapper.text()).toContain('Clear filters')
    // Crucially NOT the first-upload screen.
    expect(wrapper.text()).not.toContain("You haven't uploaded anything yet")
  })

  it('restores the list when the filter is cleared', async () => {
    state.data.value = [video()]
    const wrapper = await mountSuspended(StudioVideoList)

    await wrapper.find('input[type="search"]').setValue('no match')
    expect(wrapper.findAll('li')).toHaveLength(0)

    const clear = wrapper.findAll('button').find((b) => b.text().includes('Clear filters'))
    await clear!.trigger('click')

    expect(wrapper.findAll('li')).toHaveLength(1)
  })

  it('links each row to its own edit route', async () => {
    state.data.value = [video({ id: 'clip-a' })]
    const wrapper = await mountSuspended(StudioVideoList)

    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain('/studio/videos/clip-a')
  })
})
