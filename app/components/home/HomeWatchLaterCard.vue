<script lang="ts" setup>
import { formatRelativeTime } from '#shared/utils/format'
import HomeRailCard from './HomeRailCard.vue'
import type { WatchLaterItem } from '#shared/types/library'

/**
 * One saved video in the Watch later queue.
 *
 * No progress bar, unlike its two neighbouring shelves: a saved video is one
 * you *haven't* watched, and a 0% bar would claim otherwise. If you have
 * started it, the resume rail is the shelf that says so.
 *
 * "Saved 2d ago" is appended client-side because `addedAt` arrives raw — the
 * server doesn't know the viewer's clock (see `WatchLaterItem`). It's `computed`
 * rather than inline so the string is built once per item, not once per render.
 */
const props = defineProps<{ item: WatchLaterItem }>()
defineEmits<{ (e: 'remove'): void }>()

const to = computed(() => `/watch/${encodeURIComponent(props.item.slug)}`)
const meta = computed(() => `${props.item.meta} · Saved ${formatRelativeTime(props.item.addedAt)}`)
</script>

<template>
  <HomeRailCard
    :to="to"
    :title="item.title"
    :channel="item.channel"
    :image="item.image"
    :avatar-url="item.avatarUrl"
    :meta="meta"
    :chip="item.duration"
    menu-label="Remove from Watch later"
    @remove="$emit('remove')"
  />
</template>
