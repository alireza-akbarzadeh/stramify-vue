<script setup lang="ts">
import type { WatchTarget } from '#shared/types/watch'
import { Button } from '@/components/ui/button'
import { aiErrorMessage, useWatchAsk, useWatchInsights } from '@/composables/useWatchAi'
import WatchAiAsk from './WatchAiAsk.vue'
import WatchAiInsights from './WatchAiInsights.vue'

/**
 * The assistant's contents: what this video looks like from its listing, and
 * the conversation about it. No card, no heading — `WatchAiSheet` owns the
 * chrome, and this is only ever mounted inside it.
 *
 * That mounting is load-bearing rather than incidental. The sheet's content is
 * unmounted while closed, so the insights request — the one Gemini call this
 * page would otherwise make unprompted — doesn't happen until someone actually
 * opens the assistant. Nobody spends quota by loading a watch page.
 *
 * Self-fetching rather than prop-driven, the same way `WatchPlaylistQueue` and
 * `WatchSaveToPlaylist` are: nothing outside this subtree reads a conversation.
 */
const props = defineProps<{
  target: WatchTarget
  /**
   * Where the viewer is, as a getter rather than a number. The playhead moves
   * several times a second and is read exactly once — when someone presses
   * send — so passing it reactively would re-render the conversation
   * continuously to serve a value nobody is looking at. See `WatchLayout`.
   */
  playhead?: () => number
}>()

const slug = computed(() => props.target.slug)

// `true`, not a config check: this component exists only inside the sheet, and
// the sheet already refuses to render without a configured key.
const insights = useWatchInsights(slug, true)
const { turns, followUps, pendingQuestion, ask } = useWatchAsk(slug, {
  atSeconds: () => props.playhead?.()
})

const askError = computed(() => (ask.isError.value ? aiErrorMessage(ask.error.value) : null))
</script>

<template>
  <div class="space-y-4">
    <div v-if="insights.isPending.value" class="space-y-2" aria-hidden="true">
      <div class="h-4 w-full animate-pulse rounded bg-muted" />
      <div class="h-4 w-4/5 animate-pulse rounded bg-muted" />
      <div class="h-6 w-2/3 animate-pulse rounded-full bg-muted" />
    </div>

    <!-- The ask box survives this: insights are a nicety, and losing them is
         no reason to take away the thing the sheet is named after. -->
    <div
      v-else-if="insights.isError.value"
      class="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2.5"
    >
      <p class="min-w-0 flex-1 text-xs text-muted-foreground">
        {{ aiErrorMessage(insights.error.value) }}
      </p>
      <Button type="button" variant="outline" size="sm" @click="insights.refetch()">Retry</Button>
    </div>

    <WatchAiInsights v-else-if="insights.data.value" :insights="insights.data.value" />

    <WatchAiAsk
      :turns="turns"
      :pending-question="pendingQuestion"
      :follow-ups="followUps"
      :suggestions="insights.data.value?.suggestions ?? []"
      :sending="ask.isPending.value"
      :error="askError"
      @ask="ask.mutate($event)"
    />
  </div>
</template>
