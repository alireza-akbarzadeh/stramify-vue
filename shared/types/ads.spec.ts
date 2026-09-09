import { describe, expect, it } from 'vitest'
import { canSkipAd, secondsUntilSkip } from './ads'

describe('canSkipAd', () => {
  it('unlocks once the gate has elapsed', () => {
    expect(canSkipAd(4.9, 5)).toBe(false)
    expect(canSkipAd(5, 5)).toBe(true)
    expect(canSkipAd(9, 5)).toBe(true)
  })

  // A bumper sold as unskippable must not unlock at 0 the way `?? 0` would.
  it('never unlocks an unskippable creative', () => {
    expect(canSkipAd(0, null)).toBe(false)
    expect(canSkipAd(999, null)).toBe(false)
  })
})

describe('secondsUntilSkip', () => {
  // Rounded up: at 4.2s of a 5s gate a viewer still counts "1", and showing "0"
  // beside a button that does nothing reads as broken.
  it('rounds up so the readout never shows 0 while the button is inert', () => {
    expect(secondsUntilSkip(4.2, 5)).toBe(1)
    expect(secondsUntilSkip(0, 5)).toBe(5)
  })

  it('floors at zero once the gate has passed', () => {
    expect(secondsUntilSkip(5, 5)).toBe(0)
    expect(secondsUntilSkip(30, 5)).toBe(0)
  })

  it('reports nothing to wait for on an unskippable creative', () => {
    expect(secondsUntilSkip(1, null)).toBe(0)
  })
})
