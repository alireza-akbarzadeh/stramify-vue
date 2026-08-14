// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { describe, expect, it } from 'vitest'
import UploadWizard from './UploadWizard.vue'

/**
 * The wizard's shell: that it mounts, opens on the file step, and won't let a
 * creator walk forward past a step it hasn't got what it needs for.
 *
 * The transfer and the media probing are not exercised here — both need a real
 * `File` the browser can decode, which happy-dom has no codec for. They're
 * covered by `app/utils/upload.spec.ts` and by the API tests; this file covers
 * the part that decides what the creator can do next.
 *
 * A real `QueryClient` is provided rather than a stubbed `useQueryClient`:
 * `useUploadWizard` resolves the client during setup, and a mock that misses
 * makes setup throw — which Suspense swallows, leaving a render against empty
 * bindings and an error that points at the template instead of the cause.
 */
const mount = () =>
  mountSuspended(UploadWizard, {
    global: { plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]] }
  })

const button = (
  wrapper: Awaited<ReturnType<typeof mount>>,
  label: string
) => wrapper.findAll('button').find((candidate) => candidate.text().includes(label))

describe('UploadWizard', () => {
  it('opens on the file step', async () => {
    const wrapper = await mount()
    expect(wrapper.text()).toContain('Drag a video here')
  })

  it('shows all four steps up front, so the flow has a visible length', async () => {
    const wrapper = await mount()
    for (const step of ['File', 'Details', 'Visibility', 'Done']) {
      expect(wrapper.text()).toContain(step)
    }
  })

  it('offers video and music as the two kinds', async () => {
    const wrapper = await mount()
    const values = wrapper.findAll('input[type="radio"]').map((input) => input.attributes('value'))
    expect(values).toContain('video')
    expect(values).toContain('music')
  })

  it('will not advance without a file', async () => {
    // `canAdvance` is what stops step 2 from being a details form with nothing
    // behind it.
    const wrapper = await mount()
    expect(button(wrapper, 'Continue')?.attributes('disabled')).toBeDefined()
  })

  it('disables Back on the first step rather than hiding it', async () => {
    // Hiding it would move the Continue button between steps.
    const wrapper = await mount()
    expect(button(wrapper, 'Back')?.attributes('disabled')).toBeDefined()
  })

  it('switches the accepted formats when the kind changes to music', async () => {
    const wrapper = await mount()
    const input = wrapper.find('input[type="file"]')
    expect(input.attributes('accept')).toContain('video/mp4')

    const music = wrapper
      .findAll('input[type="radio"]')
      .find((radio) => radio.attributes('value') === 'music')
    await music!.trigger('change')

    expect(wrapper.find('input[type="file"]').attributes('accept')).toContain('audio/mpeg')
    expect(wrapper.find('input[type="file"]').attributes('accept')).not.toContain('video/mp4')
    expect(wrapper.text()).toContain('Drag an audio file here')
  })

  it('tells the creator nothing is uploaded yet', async () => {
    // The file is only sent on the last step, and saying so up front is the
    // honest answer to the question a creator has while filling this in.
    const wrapper = await mount()
    expect(wrapper.text()).toContain('Nothing is uploaded until you publish')
  })
})
