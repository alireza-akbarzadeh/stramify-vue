<script setup lang="ts">
import { BadgeCheck, UserMinus } from '@lucide/vue'
import ChannelAvatar from '@/components/ChannelAvatar.vue'
import ChannelNotifyMenu from '@/components/channel/ChannelNotifyMenu.vue'
import LiveBadge from '@/components/landing/LiveBadge.vue'
import { Button } from '@/components/ui/button'
import { videoCountLabel } from '@/utils/following'
import { toChannelPath, toChannelTag } from '#shared/utils/channel'
import { formatCount } from '#shared/utils/format'
import type { ChannelNotifyMode } from '#shared/types/channel'
import type { FollowedChannel } from '#shared/types/following'

/**
 * One row of the manage list: who they are, and the two things you can change
 * about following them.
 *
 * Like `ChannelDirectoryCard`, the row is not wrapped in a link — it holds two
 * controls, and a button inside an anchor is invalid and unusable by keyboard.
 * The name is the link and stretches over the row with `after:inset-0`, so the
 * whole surface is clickable while the bell and Unfollow stay siblings on their
 * own layer (`relative z-10`).
 *
 * Unfollow is the destructive action here, so it's the outline variant sitting
 * apart from the bell rather than a filled button competing with it — nothing
 * on this page should invite a mis-tap that silently drops a subscription.
 */
defineProps<{ channel: FollowedChannel; pending?: boolean }>()

defineEmits<{
  (e: 'unfollow'): void
  (e: 'notify', mode: ChannelNotifyMode): void
}>()
</script>

<template>
  <article
    class="group relative flex flex-col gap-3 rounded-2xl border border-border bg-card/40 p-3 transition-colors hover:border-foreground/20 sm:flex-row sm:items-center"
  >
    <div class="flex min-w-0 flex-1 items-center gap-3">
      <ChannelAvatar
        :name="channel.name"
        :image="channel.avatarUrl"
        class="size-12 shrink-0"
        aria-hidden="true"
      />

      <div class="min-w-0 flex-1">
        <h3 class="flex items-center gap-1.5">
          <NuxtLink
            :to="toChannelPath(channel.handle)"
            class="truncate rounded-sm text-sm font-semibold text-foreground transition-colors after:absolute after:inset-0 after:rounded-2xl group-hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {{ channel.name }}
          </NuxtLink>
          <BadgeCheck
            v-if="channel.verified"
            class="size-4 shrink-0 text-primary"
            aria-label="Verified channel"
          />
          <LiveBadge v-if="channel.isLive" class="shrink-0" />
        </h3>

        <p class="truncate text-xs text-muted-foreground">{{ toChannelTag(channel.handle) }}</p>

        <p class="mt-0.5 truncate text-xs text-muted-foreground">
          <!-- The live title is the more useful line while it exists; the
               follower/video summary is what's true the rest of the time. -->
          <template v-if="channel.isLive && channel.liveTitle">{{ channel.liveTitle }}</template>
          <template v-else>
            {{ formatCount(channel.followerCount) }} followers ·
            {{ videoCountLabel(channel.clipCount) }}
          </template>
        </p>
      </div>
    </div>

    <div class="relative z-10 flex shrink-0 items-center gap-2 sm:ml-auto">
      <ChannelNotifyMenu
        :channel="channel.name"
        :mode="channel.notify"
        :pending="pending"
        @select="$emit('notify', $event)"
      />

      <Button
        type="button"
        size="sm"
        variant="outline"
        class="flex-1 sm:flex-none"
        :disabled="pending"
        :aria-label="`Unfollow ${channel.name}`"
        @click="$emit('unfollow')"
      >
        <UserMinus />
        Unfollow
      </Button>
    </div>
  </article>
</template>
