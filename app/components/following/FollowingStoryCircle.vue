<script setup lang="ts">
import ChannelAvatar from '@/components/ChannelAvatar.vue'
import { LIVE_STORY_RING, channelRing } from '@/utils/channel'
import { storyRing, storyRingLabel, storyTarget } from '@/utils/following'
import type { FollowedChannel } from '#shared/types/following'

/**
 * One channel in the story rail — an avatar in a gradient ring.
 *
 * The ring is the whole point: it has three states (`storyRing`) so that a lit
 * one actually means something. Live gets a fixed accent gradient that slowly
 * rotates, "new this week" gets the channel's own hue held still, and everyone
 * else gets a flat border. A rail where every ring glows is decoration.
 *
 * Motion is Track B by the `motion` skill's rule — the page owns this element,
 * no Reka presence is involved — but it's plain CSS rather than `motion-v`: an
 * infinite ambient loop and a hover scale are exactly what the compositor does
 * for free, and pulling in an animation runtime per circle would cost more than
 * it buys. The rotation and the hover scale sit on **different elements** on
 * purpose: a running animation owns `transform` outright, so a scale utility on
 * the spinning ring would simply be ignored.
 */
const props = defineProps<{ channel: FollowedChannel }>()

const ring = computed(() => storyRing(props.channel))

/**
 * The ring's paint. `quiet` returns nothing and falls back to the flat class
 * below — a gradient at low contrast still reads as "lit" out of the corner of
 * your eye, which is the confusion this state exists to avoid.
 */
const ringStyle = computed(() => {
  if (ring.value === 'live') return { backgroundImage: LIVE_STORY_RING }
  if (ring.value === 'new') return { backgroundImage: channelRing(props.channel.name) }
  return undefined
})
</script>

<template>
  <NuxtLink
    :to="storyTarget(channel)"
    :aria-label="storyRingLabel(channel)"
    class="group flex w-[4.5rem] shrink-0 cursor-pointer flex-col items-center gap-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-20"
  >
    <span
      class="relative grid size-[4.5rem] place-items-center transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-active:scale-95 motion-reduce:transition-none sm:size-20"
    >
      <span
        aria-hidden="true"
        class="absolute inset-0 rounded-full"
        :class="[
          ring === 'quiet' && 'bg-border',
          ring === 'live' && 'animate-story-ring motion-reduce:animate-none'
        ]"
        :style="ringStyle"
      />
      <!-- The gap between ring and avatar. Painted, not a border, so the ring
           underneath can rotate without the gap rotating with it. -->
      <span aria-hidden="true" class="absolute inset-[3px] rounded-full bg-background" />

      <ChannelAvatar
        :name="channel.name"
        :image="channel.avatarUrl"
        class="relative size-[3.75rem] text-lg sm:size-[4.25rem]"
        aria-hidden="true"
      />

      <!-- Live said in a word as well as a colour, per the contrast rules: the
           ring alone is invisible to anyone who can't tell these hues apart. -->
      <span
        v-if="channel.isLive"
        class="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-primary px-1.5 py-px text-[10px] font-bold uppercase leading-4 tracking-wide text-primary-foreground shadow-sm"
        aria-hidden="true"
      >
        Live
      </span>
    </span>

    <span
      class="w-full truncate text-center text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground"
    >
      {{ channel.name }}
    </span>
  </NuxtLink>
</template>
