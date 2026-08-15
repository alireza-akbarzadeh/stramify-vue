<script setup lang="ts">
import { BadgeCheck } from '@lucide/vue'
import type { ChannelListItem } from '#shared/types/channel'
import ChannelAvatar from '@/components/ChannelAvatar.vue'
import LiveBadge from '@/components/LiveBadge.vue'
import { toChannelPath, toChannelTag } from '#shared/utils/channel'
import { formatCount } from '#shared/utils/format'

/**
 * A channel hit on the results page. A row rather than a directory card: the
 * results page interleaves channels with videos, and a 4-up card grid in the
 * middle of a list of videos reads as a different page.
 */
const props = defineProps<{ channel: ChannelListItem }>()

const stats = computed(
  () =>
    `${formatCount(props.channel.followerCount)} followers · ${props.channel.clipCount} videos`
)
</script>

<template>
  <NuxtLink
    :to="toChannelPath(channel.handle)"
    class="group flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <ChannelAvatar :name="channel.name" :image="channel.avatarUrl" class="size-14 shrink-0 text-lg" />

    <div class="min-w-0 flex-1">
      <p class="flex items-center gap-1.5">
        <span class="truncate text-sm font-semibold text-foreground group-hover:text-primary">
          {{ channel.name }}
        </span>
        <BadgeCheck
          v-if="channel.verified"
          class="size-4 shrink-0 text-primary"
          aria-label="Verified channel"
        />
        <LiveBadge v-if="channel.isLive" class="scale-90" />
      </p>
      <p class="truncate text-xs text-muted-foreground">
        {{ toChannelTag(channel.handle) }} · {{ stats }}
      </p>
      <p v-if="channel.tagline" class="mt-1 line-clamp-1 text-xs text-muted-foreground">
        {{ channel.tagline }}
      </p>
    </div>
  </NuxtLink>
</template>
