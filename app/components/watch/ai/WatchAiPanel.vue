<script setup lang="ts">
import { Sparkles } from '@lucide/vue'
import type { WatchTarget } from '#shared/types/watch'
import { Button } from '@/components/ui/button'
import { aiErrorMessage, useAiConfig, useWatchAsk, useWatchInsights } from '@/composables/useWatchAi'
import WatchAiAsk from './WatchAiAsk.vue'
import WatchAiInsights from './WatchAiInsights.vue'

/**
 * The assistant card: what this video is, from its listing, and a box to ask
 * about it.
 *
 * Self-fetching rather than prop-driven, the same way `WatchPlaylistQueue` and
 * `WatchSaveToPlaylist` are — nothing else on the page reads the conversation,
 * and threading four more panels through `WatchLayout` would buy nothing but
 * width in its props block. It takes the target (which the layout has anyway)
 * and the playhead.
 *
 * When no `GEMINI_API_KEY` is set the whole card renders nothing. A permanent
 * "AI not configured" box is chrome for every viewer about a decision only the
 * operator can act on; the hint that replaces it is dev-only, where the person
 * reading it is the person who can fix it.
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
const config = useAiConfig()
const enabled = computed(() => config.data.value?.enabled === true)

const insights = useWatchInsights(slug, enabled)
const { turns, followUps, pendingQuestion, ask } = useWatchAsk(slug, {
  atSeconds: () => props.playhead?.()
})

const askError = computed(() => (ask.isError.value ? aiErrorMessage(ask.error.value) : null))
const tierLabel = computed(() => (config.data.value?.tier === 'pro' ? 'Pro' : 'Free'))

/** Compiled away in production, so the setup hint below ships to nobody. */
const isDev = import.meta.dev
</script>

<template>
  <section
    v-if="enabled"
    class="overflow-hidden rounded-xl border border-border bg-card"
    aria-labelledby="watch-ai-heading"
  >
    <header class="flex items-center gap-2 border-b border-border px-4 py-3">
      <Sparkles class="size-4 text-primary" aria-hidden="true" />
      <h2 id="watch-ai-heading" class="text-sm font-semibold text-foreground">
        Ask about this video
      </h2>
      <span
        class="ml-auto rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
        :title="`Powered by ${config.data.value?.model}`"
      >
        {{ tierLabel }}
      </span>
    </header>

    <div class="space-y-4 p-4">
      <div v-if="insights.isPending.value" class="space-y-2" aria-hidden="true">
        <div class="h-4 w-full animate-pulse rounded bg-muted" />
        <div class="h-4 w-4/5 animate-pulse rounded bg-muted" />
        <div class="h-6 w-2/3 animate-pulse rounded-full bg-muted" />
      </div>

      <!-- The ask box survives this: insights are a nicety, and losing them is
           no reason to take away the thing the panel is named after. -->
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
  </section>

  <!-- Dev-only, and only when the key is genuinely absent: the panel is
       missing on purpose and this says which env var brings it back. -->
  <p
    v-else-if="isDev && config.isFetched.value"
    class="rounded-xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground"
  >
    AI assistant off — set <code class="font-mono text-foreground">GEMINI_API_KEY</code> in
    <code class="font-mono text-foreground">.env</code> to enable it.
  </p>
</template>
