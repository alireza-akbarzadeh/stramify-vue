<script lang="ts" setup>
import { historyHref } from '#shared/utils/history'
import HomeRailCard from './HomeRailCard.vue'
import type { HistoryItem } from '#shared/types/history'

/**
 * One video from the "Recently watched" rail.
 *
 * The card form of `HistoryRow` — same row, rendered for a shelf instead of a
 * list. It keeps the two things that make history history: the bar is drawn for
 * *every* item including finished ones (a full bar is the answer to "have I
 * already seen this"), and the link restarts a finished clip rather than
 * dropping the viewer at the credits — both of which `historyHref` and the
 * server's `percent` already decide.
 *
 * The chip stays the runtime rather than the time left, which is what separates
 * this from `HomeContinueCard` sitting above it: this shelf answers "what have
 * I been watching", not "what can I finish".
 */
const props = defineProps<{ item: HistoryItem }>()
defineEmits<{ (e: 'remove'): void }>()

const to = computed(() => historyHref(props.item))
</script>

<template>
  <HomeRailCard
    :to="to"
    :title="item.title"
    :channel="item.channel"
    :image="item.image"
    :avatar-url="item.avatarUrl"
    :meta="item.meta"
    :chip="item.duration"
    :percent="item.percent"
    :progress-label="item.progressLabel"
    menu-label="Remove from watch history"
    @remove="$emit('remove')"
  />
</template>
