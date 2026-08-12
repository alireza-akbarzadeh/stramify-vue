<script lang="ts" setup>
import { resumeHref } from '#shared/utils/library'
import HomeRailCard from './HomeRailCard.vue'
import type { ContinueWatchingItem } from '#shared/types/library'

/**
 * A part-watched clip, with the bar showing how far in you got.
 *
 * The chrome is `HomeRailCard`, shared with the recently-watched and Watch
 * later shelves. What's left here is the three things that make this card the
 * *resume* card: the link carries a `?t=`, the corner chip is time remaining
 * rather than the runtime — on a video you're partway through, that's the
 * number you actually want — and the menu forgets the position.
 */
const props = defineProps<{ item: ContinueWatchingItem }>()
defineEmits<{ (e: 'remove'): void }>()

const to = computed(() => resumeHref(props.item.slug, props.item.positionSeconds))
</script>

<template>
  <HomeRailCard
    :to="to"
    :title="item.title"
    :channel="item.channel"
    :image="item.image"
    :avatar-url="item.avatarUrl"
    :meta="item.meta"
    :chip="item.remaining"
    :percent="item.percent"
    :progress-label="item.remaining"
    menu-label="Remove from Continue watching"
    @remove="$emit('remove')"
  />
</template>
