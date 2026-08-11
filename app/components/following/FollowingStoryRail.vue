<script setup lang="ts">
import HomeRail from '@/components/home/HomeRail.vue'
import FollowingStoryCircle from './FollowingStoryCircle.vue'
import type { FollowedChannel } from '#shared/types/following'

/**
 * Every channel you follow, as a row of story circles.
 *
 * This is the glanceable answer to "who do I follow" — live channels first
 * (the server orders them, see `FOLLOWED_ORDER`), then most recently followed.
 * The manage list on `/following` is the same set in the shape you need when
 * you want to *change* something; this one is for leaving again quickly.
 *
 * Rendered on two surfaces, so the heading's link and DOM id are props rather
 * than baked in: on `/following` the useful onward journey is the directory
 * ("Find more" → `/channels`, the defaults below), while on the home page it's
 * the following page itself. Everything else — the ordering, the circles, the
 * ring states — is identical, which is the point of it being one component.
 *
 * The rail chrome is `HomeRail`, shared with every shelf on the home page, so
 * the arrows, the snap track and the keyboard behaviour are the ones already
 * proven here rather than a second implementation. It only needs its own
 * `step`: circles are a fifth the width of a video card, and the shared default
 * would jump seven of them at a time.
 */
withDefaults(
  defineProps<{
    channels: FollowedChannel[]
    /** Where the heading's link goes. */
    to?: string
    toLabel?: string
    /**
     * DOM id the section's `aria-labelledby` points at. Unique per surface, so
     * that two rails on one page could never collide on it.
     */
    headingId?: string
  }>(),
  {
    to: '/channels',
    toLabel: 'Find more',
    headingId: 'following-channels-heading'
  }
)

/** Roughly five circles, so a press always leaves the last one or two in view. */
const STEP = 420
</script>

<template>
  <HomeRail
    :heading-id="headingId"
    title="Channels you follow"
    :to="to"
    :to-label="toLabel"
    :step="STEP"
  >
    <li v-for="channel in channels" :key="channel.handle" class="snap-start">
      <FollowingStoryCircle :channel="channel" />
    </li>
  </HomeRail>
</template>
