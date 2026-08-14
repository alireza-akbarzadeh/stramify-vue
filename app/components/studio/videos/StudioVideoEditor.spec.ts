// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { describe, expect, it } from 'vitest'
import StudioVideoEditor from './StudioVideoEditor.vue'
import type { StudioVideo } from '#shared/types/studio'

/**
 * The edit page's form.
 *
 * It shares `StudioVideoFields` and `studioDetailsValidation` with the upload
 * wizard, so it shares the wizard's failure modes too — this file exists so
 * that a schema change which breaks `useForm` fails in two places rather than
 * being caught in one and shipped in the other.
 */
function video(overrides: Partial<StudioVideo> = {}): StudioVideo {
  return {
    id: 'clip-a',
    title: 'Midnight Echo',
    description: 'A rooftop set',
    category: 'Music',
    visibility: 'unlisted',
    orientation: 'landscape',
    thumbnailUrl: '/api/media/thumb/a.jpg',
    videoUrl: '/api/media/video/a.mp4',
    durationSeconds: 245,
    views: 1200,
    comments: 3,
    likes: 42,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides
  }
}

const mount = (overrides: Partial<StudioVideo> = {}) =>
  mountSuspended(StudioVideoEditor, {
    props: { video: video(overrides) },
    global: { plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]] }
  })

describe('StudioVideoEditor', () => {
  it('seeds the form from the video it was given', async () => {
    const wrapper = await mount()
    expect(wrapper.find('input').element.value).toBe('Midnight Echo')
    expect(wrapper.find('textarea').element.value).toBe('A rooftop set')
  })

  it('preselects the current visibility', async () => {
    const wrapper = await mount({ visibility: 'private' })
    const checked = wrapper
      .findAll('input[type="radio"]')
      .filter((input) => input.element.checked)
      .map((input) => input.attributes('value'))
    expect(checked).toContain('private')
  })

  it('keeps Save disabled until something actually changes', async () => {
    // `meta.dirty` — a Save that is always live invites saving nothing and
    // makes "unsaved changes" meaningless.
    const wrapper = await mount()
    const save = wrapper.findAll('button').find((b) => b.text().includes('Save changes'))
    expect(save?.attributes('disabled')).toBeDefined()

    await wrapper.find('input').setValue('Midnight Echo (remaster)')
    expect(
      wrapper.findAll('button').find((b) => b.text().includes('Save changes'))?.attributes('disabled')
    ).toBeUndefined()
  })

  it('warns about unsaved changes only once there are some', async () => {
    const wrapper = await mount()
    expect(wrapper.text()).not.toContain('You have unsaved changes')

    await wrapper.find('input').setValue('Something else')
    expect(wrapper.text()).toContain('You have unsaved changes')
  })

  it('shows the engagement the creator came to see', async () => {
    const wrapper = await mount()
    expect(wrapper.text()).toContain('1.2k')
    expect(wrapper.text()).toContain('42')
    expect(wrapper.text()).toContain('04:05')
  })

  it('links to the live watch page', async () => {
    const wrapper = await mount()
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain('/watch/clip-a')
  })

  it('keeps delete out of reach of the save button', async () => {
    // Destructive action, visually and structurally separated — not sitting
    // next to Save where a mis-aimed click lands on the wrong one.
    const wrapper = await mount()
    const del = wrapper.findAll('button').find((b) => b.text().includes('Delete video'))
    expect(del).toBeTruthy()
    expect(wrapper.text()).toContain("There's no undo")
  })
})
