<script setup lang="ts">
import HomeRailSkeleton from '@/components/home/HomeRailSkeleton.vue'
import { Button } from '@/components/ui/button'
import { useFollowedChannels, useFollowingShelves } from '@/composables/useFollowing'
import { useAuthStore } from '@/stores/auth'
import { followingSummary } from '@/utils/following'
import FollowingChannelList from './FollowingChannelList.vue'
import FollowingChannelShelf from './FollowingChannelShelf.vue'
import FollowingEmpty from './FollowingEmpty.vue'
import FollowingStoryRail from './FollowingStoryRail.vue'
import FollowingStoryRailSkeleton from './FollowingStoryRailSkeleton.vue'

/**
 * `/following` — who you follow, and what they've published.
 *
 * Three sections, in the order the questions get less urgent: the story rail
 * (who's on air right now), a shelf per channel (what's new, most prolific
 * channels first), and the manage list (change something). The story rail and
 * the manage list both show every follow; only the shelves are capped, and the
 * cap is documented on `FOLLOWING_SHELF_LIMIT`.
 *
 * The two queries are independent on purpose — the channel list is cheap and
 * paints the rail while the heavier shelf query is still in flight, so the page
 * is useful before it's complete.
 */
const auth = useAuthStore()
const channels = useFollowedChannels()
const shelves = useFollowingShelves()

/**
 * A disabled TanStack query stays `pending` forever, so every signed-in-only
 * surface has to check the session before trusting it — otherwise a logged-out
 * visitor gets skeletons that never resolve. Same guard as `HomeShelves`.
 */
const signedIn = computed(() => auth.isAuthenticated)
const pending = computed(() => signedIn.value && channels.isPending.value)
const shelvesPending = computed(() => signedIn.value && shelves.isPending.value)
const errored = computed(() => channels.isError.value || shelves.isError.value)

const list = computed(() => channels.data.value ?? [])
const rows = computed(() => shelves.data.value ?? [])

function retry() {
  channels.refetch()
  shelves.refetch()
}
</script>

<template>
  <div class="mx-auto max-w-[1600px] px-4 pb-16 sm:px-6 lg:px-8">
    <header class="py-6">
      <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Following</h1>
      <p v-if="list.length" class="mt-1 text-sm text-muted-foreground">
        {{ followingSummary(list) }}
      </p>
    </header>

    <FollowingEmpty v-if="!signedIn" :signed-in="false" />

    <div v-else-if="pending" class="space-y-10" role="status" aria-label="Loading your channels">
      <FollowingStoryRailSkeleton />
      <HomeRailSkeleton />
      <HomeRailSkeleton />
    </div>

    <div
      v-else-if="errored"
      class="rounded-xl border border-dashed border-destructive/40 py-16 text-center"
    >
      <p class="text-lg font-semibold text-foreground">Couldn't load your channels</p>
      <p class="mt-2 text-sm text-muted-foreground">The request didn't reach the server.</p>
      <Button class="mt-4" size="sm" type="button" variant="outline" @click="retry">Retry</Button>
    </div>

    <FollowingEmpty v-else-if="!list.length" :signed-in="true" />

    <div v-else class="space-y-10">
      <FollowingStoryRail :channels="list" />

      <HomeRailSkeleton v-if="shelvesPending" />
      <template v-else>
        <FollowingChannelShelf
          v-for="shelf in rows"
          :key="shelf.channel.handle"
          :shelf="shelf"
        />
      </template>

      <!-- Following channels that have never uploaded is a real state, not a
           failure: they may only ever stream. Say which it is rather than
           leaving a gap between the rail and the manage list. -->
      <p
        v-if="!shelvesPending && !rows.length"
        class="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground"
      >
        None of the channels you follow has published a video yet.
      </p>

      <FollowingChannelList :channels="list" />
    </div>
  </div>
</template>
