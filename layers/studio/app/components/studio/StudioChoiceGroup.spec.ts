// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import StudioChoiceGroup from './StudioChoiceGroup.vue'
import type { ClipVisibility } from '#shared/types/studio'

const choices = [
  { value: 'private' as ClipVisibility, label: 'Private', detail: 'Only you.' },
  { value: 'public' as ClipVisibility, label: 'Public', detail: 'Everyone.' }
]

function mount(modelValue: ClipVisibility = 'private') {
  return mountSuspended(StudioChoiceGroup, {
    props: { modelValue, choices, label: 'Visibility' }
  })
}

describe('StudioChoiceGroup', () => {
  it('renders one real radio per choice', async () => {
    // Real inputs are what buy arrow-key navigation, the roving tab stop and
    // screen-reader announcement — a div with role="radio" gets at least one
    // of those wrong.
    const wrapper = await mount()
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(2)
  })

  it('groups the radios under one name so they are mutually exclusive', async () => {
    const wrapper = await mount()
    const names = wrapper.findAll('input[type="radio"]').map((input) => input.attributes('name'))
    expect(new Set(names).size).toBe(1)
    expect(names[0]).toBeTruthy()
  })

  it('checks the radio matching the model value', async () => {
    const wrapper = await mount('public')
    const checked = wrapper
      .findAll('input[type="radio"]')
      .filter((input) => input.element.checked)
      .map((input) => input.attributes('value'))
    expect(checked).toEqual(['public'])
  })

  it('emits the chosen value rather than mutating the prop', async () => {
    const wrapper = await mount('private')
    await wrapper.findAll('input[type="radio"]')[1]!.trigger('change')
    expect(wrapper.emitted('update:modelValue')).toEqual([['public']])
  })

  it('names the group for screen readers without showing the legend', async () => {
    const wrapper = await mount()
    const legend = wrapper.find('legend')
    expect(legend.text()).toBe('Visibility')
    expect(legend.classes()).toContain('sr-only')
  })

  it('shows each choice detail, not just its label', async () => {
    // The detail is the consequence of picking it; hiding it behind a select
    // is what this component exists to avoid.
    const wrapper = await mount()
    expect(wrapper.text()).toContain('Only you.')
    expect(wrapper.text()).toContain('Everyone.')
  })
})
