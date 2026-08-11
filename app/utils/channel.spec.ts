import { describe, expect, it } from 'vitest'
import { LIVE_STORY_RING, channelGradient, channelHue, channelRing } from './channel'

/** The stops of a gradient, in order, as written. */
function stops(gradient: string): string[] {
  return [...gradient.matchAll(/oklch\([^)]*\)/g)].map((match) => match[0] ?? '')
}

describe('channel colour', () => {
  it('gives the same channel the same hue every time', () => {
    expect(channelHue('Canvas_Queen')).toBe(channelHue('Canvas_Queen'))
    expect(channelHue('Canvas_Queen')).not.toBe(channelHue('Viper_Squadron'))
  })

  it('keeps the hue inside a legal range whatever the name', () => {
    for (const name of ['', 'a', 'Canvas_Queen', '🎨 studio', 'x'.repeat(500)]) {
      const hue = channelHue(name)
      expect(hue).toBeGreaterThanOrEqual(0)
      expect(hue).toBeLessThan(360)
    }
  })

  it('builds the avatar fallback from that hue', () => {
    expect(channelGradient('Canvas_Queen')).toContain('linear-gradient')
    expect(channelGradient('Canvas_Queen')).toBe(channelGradient('Canvas_Queen'))
  })
})

/**
 * The story rings are rotated a full turn on a loop, so a first stop that
 * doesn't match the last one shows up as a hard seam sweeping round the circle
 * — the one defect in this file that is invisible in a screenshot and obvious
 * in motion.
 */
describe('story rings', () => {
  it('closes the loop, so a full rotation has no seam', () => {
    const ring = stops(channelRing('Canvas_Queen'))
    expect(ring.length).toBeGreaterThan(2)
    expect(ring.at(0)).toBe(ring.at(-1))

    const live = stops(LIVE_STORY_RING)
    expect(live.length).toBeGreaterThan(2)
    expect(live.at(0)).toBe(live.at(-1))
  })

  it('is conic, so it reads as a ring rather than a diagonal wash', () => {
    expect(channelRing('Canvas_Queen')).toContain('conic-gradient')
    expect(LIVE_STORY_RING).toContain('conic-gradient')
  })

  it('ties the channel ring to the same hue as that channel’s avatar', () => {
    const hue = channelHue('Canvas_Queen')
    expect(channelRing('Canvas_Queen')).toContain(`${hue}`)
    expect(channelRing('Canvas_Queen')).not.toBe(channelRing('Viper_Squadron'))
  })

  it('keeps live visually distinct from any channel’s own ring', () => {
    // Live has to mean one thing at a glance across the rail, so unlike the
    // per-channel ring it is a constant rather than a function of the name —
    // and it must not collide with what some channel's hue would produce.
    for (const name of ['Canvas_Queen', 'Viper_Squadron', 'first_take', '']) {
      expect(channelRing(name)).not.toBe(LIVE_STORY_RING)
    }
    expect(LIVE_STORY_RING).not.toContain('undefined')
    expect(LIVE_STORY_RING).not.toContain('NaN')
  })
})
