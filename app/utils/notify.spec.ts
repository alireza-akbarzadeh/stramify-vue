import { describe, expect, it } from 'vitest'
import { CHANNEL_NOTIFY_MODES } from '#shared/types/channel'
import { NOTIFY_OPTIONS, notifyConfirmation } from './notify'

describe('notifyConfirmation', () => {
  it('names the channel and what will actually arrive', () => {
    expect(notifyConfirmation('all', 'EchoCollective')).toBe(
      "You'll hear about everything from EchoCollective"
    )
    expect(notifyConfirmation('live', 'EchoCollective')).toBe(
      "You'll only hear when EchoCollective goes live"
    )
    expect(notifyConfirmation('none', 'EchoCollective')).toBe(
      'Notifications off for EchoCollective'
    )
  })
})

describe('NOTIFY_OPTIONS', () => {
  it('covers every mode the menu can render', () => {
    for (const mode of CHANNEL_NOTIFY_MODES) {
      expect(NOTIFY_OPTIONS[mode].label).toBeTruthy()
      expect(NOTIFY_OPTIONS[mode].hint).toBeTruthy()
    }
  })
})
