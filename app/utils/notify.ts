import { Bell, BellOff, BellRing, Radio } from '@lucide/vue'
import type { Component } from 'vue'
import type { ChannelNotifyMode } from '#shared/types/channel'

export interface NotifyOption {
  label: string
  /** One line under the label saying what actually arrives. */
  hint: string
  icon: Component
}

/**
 * How each bell setting presents itself. Kept beside the copy rather than in
 * the menu component so the trigger, the menu and the confirmation toast can't
 * describe the same setting three different ways (same reason `nav.ts` holds
 * its own icons).
 */
export const NOTIFY_OPTIONS: Record<ChannelNotifyMode, NotifyOption> = {
  all: { label: 'All', hint: 'Every upload and every stream', icon: BellRing },
  live: { label: 'Live only', hint: 'Just when this channel goes live', icon: Radio },
  none: { label: 'None', hint: 'Follow quietly', icon: BellOff }
}

/** The icon on the trigger — a plain bell reads as "off" better than a struck one. */
export const NOTIFY_OFF_ICON = Bell

/**
 * What the toast says once the change is saved. Phrased as the outcome the
 * viewer will notice ("we'll ping you when…"), not as the setting's name,
 * because the setting is already visible on the button they just pressed.
 */
export function notifyConfirmation(mode: ChannelNotifyMode, channel: string): string {
  if (mode === 'all') return `You'll hear about everything from ${channel}`
  if (mode === 'live') return `You'll only hear when ${channel} goes live`
  return `Notifications off for ${channel}`
}
