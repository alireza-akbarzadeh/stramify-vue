<script setup lang="ts">
import { useContinueWatching } from '@/composables/useContinueWatching'
import { useFollowingFeed } from '@/composables/useFollowingFeed'
import { useHomeShorts } from '@/composables/useHomeShorts'
import { useMixes } from '@/composables/useMixes'
import { usePlaylists } from '@/composables/usePlaylists'
import { useAuthStore } from '@/stores/auth'
import HomeContinueRail from './HomeContinueRail.vue'
import HomeFollowingRail from './HomeFollowingRail.vue'
import HomeMixRail from './HomeMixRail.vue'
import HomePlaylistRail from './HomePlaylistRail.vue'
import HomeRailSkeleton from './HomeRailSkeleton.vue'
import HomeShortsRail from './HomeShortsRail.vue'

/**
 * Every shelf above the recommended grid, in the order a viewer's intent gets
 * weaker:
 *
 * 1. **Continue watching** — you already chose these and didn't finish them.
 * 2. **Latest from channels you follow** — you chose the channel.
 * 3. **Shorts** — a different format, not a different taste; kept high because
 *    it's the one row that isn't more of the same shape.
 * 4. **Mixes for you** — "more of a kind of thing you like".
 * 5. **Your playlists** — yours, but you came to the home page to watch
 *    something, not to manage collections.
 *
 * Every one of them renders only when it has content, so a signed-out visitor
 * sees two shelves and a signed-in one with no history sees three — the page
 * never shows an empty shelf inviting you to go make one.
 *
 * All five queries live here rather than in `HomeView` so that file stays the
 * chip bar and the grid. They're independent, cached separately, and none
 * blocks the grid.
 */
const auth = useAuthStore()

const { data: continueItems, isPending: continuePending } = useContinueWatching()
const { data: following, isPending: followingPending } = useFollowingFeed()
const { data: shorts } = useHomeShorts()
const { data: mixes } = useMixes()
const { data: playlists } = usePlaylists()

/**
 * A disabled TanStack query stays `pending` forever, so every signed-in-only
 * shelf has to check the session before it trusts `isPending` — otherwise a
 * logged-out visitor gets skeletons that never resolve.
 */
const showContinueSkeleton = computed(() => auth.isAuthenticated && continuePending.value)
const showFollowingSkeleton = computed(() => auth.isAuthenticated && followingPending.value)
</script>

<template>
  <HomeRailSkeleton v-if="showContinueSkeleton" />
  <HomeContinueRail v-else-if="continueItems?.length" :items="continueItems" />

  <HomeRailSkeleton v-if="showFollowingSkeleton" />
  <HomeFollowingRail v-else-if="following?.length" :videos="following" />

  <HomeShortsRail v-if="shorts?.length" :shorts="shorts" />

  <HomeMixRail v-if="mixes?.length" :mixes="mixes" />

  <HomePlaylistRail v-if="playlists?.length" :playlists="playlists" />
</template>
