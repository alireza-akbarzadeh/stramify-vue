<script lang="ts" setup>
import HomeRailCard from '@/components/home/HomeRailCard.vue'
import { formatRelativeTime } from '#shared/utils/format'
import type { LikedItem } from '#shared/types/library'

/**
 * One liked video.
 *
 * `HomeRailCard` again rather than a fourth near-identical card (CLAUDE.md
 * rule 10): a liked video is one of the viewer's *own* rows, which is exactly
 * what that component is for — thumbnail, corner chip, one destructive action
 * behind a ⋮ menu. The differences are props.
 *
 * No progress bar, like the Watch later card: liking something says nothing
 * about how far into it you got, and a 0% bar would claim it had been started.
 *
 * "Liked 2d ago" is appended client-side because `likedAt` arrives raw — the
 * server doesn't know the viewer's clock (see `LikedItem`). It's `computed`
 * rather than inline so the string is built once per item, not once per render.
 */
const props = defineProps<{ item: LikedItem }>()
defineEmits<{ (e: 'remove'): void }>()

const to = computed(() => `/watch/${encodeURIComponent(props.item.slug)}`)
const meta = computed(() => `${props.item.meta} · Liked ${formatRelativeTime(props.item.likedAt)}`)
</script>

<template>
  <HomeRailCard
    :avatar-url="item.avatarUrl"
    :channel="item.channel"
    :chip="item.duration"
    :image="item.image"
    :meta="meta"
    :title="item.title"
    :to="to"
    menu-label="Remove from Liked videos"
    @remove="$emit('remove')"
  />
</template>
