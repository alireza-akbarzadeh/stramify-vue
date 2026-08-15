<script setup lang="ts">
import { BadgeCheck } from '@lucide/vue'
import ChannelAvatar from '@/components/ChannelAvatar.vue'
import HomeRail from '@/components/home/HomeRail.vue'
import HomeVideoCard from '@/components/home/HomeVideoCard.vue'
import LiveBadge from '@/components/LiveBadge.vue'
import { useSavedVideos } from '@/composables/useSavedVideos'
import { videoCountLabel } from '@/utils/following'
import { relatedToItem } from '@/utils/watchlist'
import { toChannelPath } from '#shared/utils/channel'
import type { FollowingShelf } from '#shared/types/following'

/**
 * One followed channel's recent uploads.
 *
 * "See all" goes to that channel's Videos tab rather than to a new
 * all-your-subscriptions page: the destination already exists, already sorts
 * and already paginates, and sending someone to a second list of the same
 * videos would be a page whose only job is to be a longer version of this row.
 * The count in the heading is the same landscape-clip count that tab shows, so
 * the number and the destination agree.
 *
 * The ⋮ feedback items are off. This is a channel's own shelf, not a
 * recommendation, so "Don't recommend this channel" has no meaning here — the
 * honest control for that is Unfollow, in the manage list below. (Feedback
 * given on the home page is still honoured; the query filters on it.)
 */
const props = defineProps<{ shelf: FollowingShelf }>()

const saved = useSavedVideos()

const headingId = computed(() => `following-shelf-${props.shelf.channel.handle}`)
const to = computed(() => `${toChannelPath(props.shelf.channel.handle)}?tab=videos`)
</script>

<template>
  <HomeRail :heading-id="headingId" :title="shelf.channel.name" :to="to" to-label="See all">
    <template #heading>
      <h2 :id="headingId" class="flex min-w-0 items-center gap-2.5">
        <NuxtLink
          :to="toChannelPath(shelf.channel.handle)"
          class="flex min-w-0 items-center gap-2.5 rounded-lg transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChannelAvatar
            :name="shelf.channel.name"
            :image="shelf.channel.avatarUrl"
            class="size-8"
            aria-hidden="true"
          />
          <span class="truncate text-lg font-semibold text-foreground">
            {{ shelf.channel.name }}
          </span>
        </NuxtLink>

        <BadgeCheck
          v-if="shelf.channel.verified"
          class="size-4 shrink-0 text-primary"
          aria-label="Verified channel"
        />
        <LiveBadge v-if="shelf.channel.isLive" class="shrink-0" />

        <span class="hidden shrink-0 text-sm text-muted-foreground sm:inline">
          {{ videoCountLabel(shelf.channel.clipCount) }}
        </span>
      </h2>
    </template>

    <li
      v-for="video in shelf.videos"
      :key="`${video.kind}-${video.id}`"
      class="w-[calc(100%-2rem)] shrink-0 snap-start sm:w-72"
    >
      <HomeVideoCard
        :video="video"
        :saved="saved.isSaved(video.id, video.kind)"
        :allow-feedback="false"
        @toggle-save="saved.toggle(relatedToItem(video))"
      />
    </li>
  </HomeRail>
</template>
