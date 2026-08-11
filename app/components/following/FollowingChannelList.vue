<script setup lang="ts">
import { useChannelNotify } from '@/composables/useChannel'
import { useUnfollowChannel } from '@/composables/useFollowing'
import FollowingChannelRow from './FollowingChannelRow.vue'
import type { ChannelNotifyMode } from '#shared/types/channel'
import type { FollowedChannel } from '#shared/types/following'

/**
 * The manage list: every channel you follow, with the bell and Unfollow.
 *
 * It sits below the shelves because you come to this page to watch something
 * far more often than to prune the list, and a wall of management rows between
 * the story circles and the first video would be answering the rarer question
 * first. It shows *every* follow, including the ones past
 * `FOLLOWING_SHELF_LIMIT` that didn't get a shelf.
 *
 * The mutations live here rather than in the row so each row stays presentation
 * plus two emits, and both go through the app's shared channel mutations — the
 * same ones the watch page and the directory use — so a bell switched here is
 * switched everywhere.
 */
defineProps<{ channels: FollowedChannel[] }>()

const { unfollow } = useUnfollowChannel()
const notify = useChannelNotify()

/**
 * Which row is mid-request. Only the bell needs it: an unfollowed row is
 * removed from the cache the moment it's pressed, so there's nothing left to
 * disable.
 */
const busy = ref<string | null>(null)

function onNotify(channel: FollowedChannel, mode: ChannelNotifyMode) {
  busy.value = channel.handle
  notify.mutate({ name: channel.handle, mode }, { onSettled: () => (busy.value = null) })
}
</script>

<template>
  <section aria-labelledby="following-manage-heading" class="min-w-0">
    <div class="mb-4 flex items-baseline gap-3">
      <h2 id="following-manage-heading" class="text-lg font-semibold text-foreground">
        Manage channels you follow
      </h2>
      <span class="shrink-0 text-sm text-muted-foreground">{{ channels.length }}</span>
    </div>

    <ul class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <li v-for="channel in channels" :key="channel.handle">
        <FollowingChannelRow
          :channel="channel"
          :pending="busy === channel.handle"
          @unfollow="unfollow(channel)"
          @notify="onNotify(channel, $event)"
        />
      </li>
    </ul>
  </section>
</template>
