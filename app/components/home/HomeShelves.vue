<script setup lang="ts">
import FollowingStoryRail from '@/components/following/FollowingStoryRail.vue'
import FollowingStoryRailSkeleton from '@/components/following/FollowingStoryRailSkeleton.vue'
import { useContinueWatching } from '@/composables/useContinueWatching'
import { useFollowedChannels } from '@/composables/useFollowing'
import { useFollowingFeed } from '@/composables/useFollowingFeed'
import { useRecentHistory } from '@/composables/useHistory'
import { useHomeShorts } from '@/composables/useHomeShorts'
import { useMixes } from '@/composables/useMixes'
import { usePlaylists } from '@/composables/usePlaylists'
import { useWatchLater } from '@/composables/useWatchLater'
import { useAuthStore } from '@/stores/auth'
import { WATCH_LATER_RAIL_LIMIT } from '#shared/types/library'
import HomeContinueRail from './HomeContinueRail.vue'
import HomeFollowingRail from './HomeFollowingRail.vue'
import HomeHistoryRail from './HomeHistoryRail.vue'
import HomeMixRail from './HomeMixRail.vue'
import HomePlaylistRail from './HomePlaylistRail.vue'
import HomeRailSkeleton from './HomeRailSkeleton.vue'
import HomeShortsRail from './HomeShortsRail.vue'
import HomeWatchLaterRail from './HomeWatchLaterRail.vue'

/**
 * Every shelf above the recommended grid, in the order a viewer's intent gets
 * weaker:
 *
 * 1. **Channels you follow** — the story circles. First because it's the only
 *    row that is navigation rather than content, and because it carries the one
 *    thing on the page that expires: who is live right now.
 * 2. **Continue watching** — you already chose these and didn't finish them.
 * 3. **Watch later** — you also chose these, explicitly, which is the strongest
 *    signal on the page; it sits below Continue watching only because a video
 *    you're halfway through is closer to done than one you haven't started.
 * 4. **Recently watched** — the last ten you opened, finished or not. Below the
 *    two intent shelves because it's a record rather than a queue: nothing here
 *    is waiting on you. Its overlap with Continue watching is deliberate — see
 *    `HomeHistoryRail` for what separates the two.
 * 5. **Latest from channels you follow** — you chose the channel. It sits below
 *    the circles on purpose: the circles say *who*, this says *what*, and
 *    answering "who" first is the order a subscriptions page reads in.
 * 6. **Shorts** — a different format, not a different taste; kept high because
 *    it's the one row that isn't more of the same shape.
 * 7. **Mixes for you** — "more of a kind of thing you like".
 * 8. **Your playlists** — yours, but you came to the home page to watch
 *    something, not to manage collections.
 *
 * Every one of them renders only when it has content, so a signed-out visitor
 * sees two shelves and a signed-in one with no history sees three — the page
 * never shows an empty shelf inviting you to go make one.
 *
 * All eight queries live here rather than in `HomeView` so that file stays the
 * chip bar and the grid. They're independent, cached separately, and none
 * blocks the grid. The channel list is the same query `/following` runs, so the
 * two surfaces share one cache entry rather than fetching it twice.
 */
const auth = useAuthStore()

const { data: channels, isPending: channelsPending } = useFollowedChannels()
const { data: continueItems, isPending: continuePending } = useContinueWatching()
const { data: watchLater, isPending: watchLaterPending } = useWatchLater(WATCH_LATER_RAIL_LIMIT)
const { data: watched, isPending: watchedPending } = useRecentHistory()
const { data: following, isPending: followingPending } = useFollowingFeed()
const { data: shorts } = useHomeShorts()
const { data: mixes } = useMixes()
const { data: playlists } = usePlaylists()

/**
 * A disabled TanStack query stays `pending` forever, so every signed-in-only
 * shelf has to check the session before it trusts `isPending` — otherwise a
 * logged-out visitor gets skeletons that never resolve.
 */
const showChannelsSkeleton = computed(() => auth.isAuthenticated && channelsPending.value)
const showContinueSkeleton = computed(() => auth.isAuthenticated && continuePending.value)
const showWatchLaterSkeleton = computed(() => auth.isAuthenticated && watchLaterPending.value)
const showWatchedSkeleton = computed(() => auth.isAuthenticated && watchedPending.value)
const showFollowingSkeleton = computed(() => auth.isAuthenticated && followingPending.value)
</script>

<template>
  <!-- "See all" here rather than the rail's default "Find more": from home the
       useful onward journey is the following page, which the copy of this rail
       living on that page obviously can't link to. -->
  <FollowingStoryRailSkeleton v-if="showChannelsSkeleton" />
  <FollowingStoryRail
    v-else-if="channels?.length"
    :channels="channels"
    to="/following"
    to-label="See all"
    heading-id="home-following-channels-heading"
  />

  <HomeRailSkeleton v-if="showContinueSkeleton" />
  <HomeContinueRail v-else-if="continueItems?.length" :items="continueItems" />

  <HomeRailSkeleton v-if="showWatchLaterSkeleton" />
  <HomeWatchLaterRail v-else-if="watchLater?.length" :items="watchLater" />

  <HomeRailSkeleton v-if="showWatchedSkeleton" />
  <HomeHistoryRail v-else-if="watched?.length" :items="watched" />

  <HomeRailSkeleton v-if="showFollowingSkeleton" />
  <HomeFollowingRail v-else-if="following?.length" :videos="following" />

  <HomeShortsRail v-if="shorts?.length" :shorts="shorts" />

  <HomeMixRail v-if="mixes?.length" :mixes="mixes" />

  <HomePlaylistRail v-if="playlists?.length" :playlists="playlists" />
</template>
