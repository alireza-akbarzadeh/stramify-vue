// @vitest-environment nuxt
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { toSeries } from '#shared/utils/trend'
import TrendChart from './TrendChart.vue'

const series = toSeries('followers', 'New followers', [
  { date: '2026-08-05', value: 0 },
  { date: '2026-08-06', value: 4 },
  { date: '2026-08-07', value: 2 }
])

describe('TrendChart', () => {
  it('renders the label, total and peak', async () => {
    const wrapper = await mountSuspended(TrendChart, { props: { series } })
    expect(wrapper.text()).toContain('New followers')
    expect(wrapper.text()).toContain('6')
    expect(wrapper.text()).toContain('Peak 4/day')
  })

  it('labels the window ends', async () => {
    const wrapper = await mountSuspended(TrendChart, { props: { series } })
    expect(wrapper.text()).toContain('2026-08-05')
    expect(wrapper.text()).toContain('2026-08-07')
  })

  it('exposes an accessible summary on the svg', async () => {
    const wrapper = await mountSuspended(TrendChart, { props: { series } })
    const svg = wrapper.find('svg')
    expect(svg.attributes('role')).toBe('img')
    expect(svg.attributes('aria-label')).toContain('New followers')
  })

  it('still draws a baseline when every day is zero', async () => {
    const flat = toSeries('engagement', 'Comments + reactions', [
      { date: '2026-08-06', value: 0 },
      { date: '2026-08-07', value: 0 }
    ])
    const wrapper = await mountSuspended(TrendChart, { props: { series: flat } })
    expect(wrapper.text()).toContain('Peak 0/day')
    expect(wrapper.find('line').exists()).toBe(true)
    // A flat series must not blow up the y-scale by dividing by a zero peak.
    expect(wrapper.find('path').attributes('d')).not.toContain('NaN')
  })
})
