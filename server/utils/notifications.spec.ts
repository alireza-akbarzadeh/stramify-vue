import { describe, expect, it } from 'vitest'
import type { ChannelNotifyMode } from '#shared/types/channel'
import { handlesFor } from './notifications'

const modes = new Map<string, ChannelNotifyMode>([
  ['echocollective', 'all'],
  ['viper_squadron', 'live'],
  ['patch_bay', 'none']
])

describe('handlesFor', () => {
  it('reads live sessions for everyone except the muted channels', () => {
    expect(handlesFor(modes, 'live')).toEqual(['echocollective', 'viper_squadron'])
  })

  it('reads uploads only for channels set to hear about everything', () => {
    expect(handlesFor(modes, 'upload')).toEqual(['echocollective'])
  })

  it('returns nothing when every follow is muted', () => {
    const silent = new Map<string, ChannelNotifyMode>([['patch_bay', 'none']])
    expect(handlesFor(silent, 'live')).toEqual([])
    expect(handlesFor(silent, 'upload')).toEqual([])
  })
})
