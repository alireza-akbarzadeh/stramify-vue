<script setup lang="ts">
import type { WatchTarget } from '#shared/types/watch'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet'
import { useAiConfig } from '@/composables/useWatchAi'
import GeminiIcon from './GeminiIcon.vue'
import WatchAiPanel from './WatchAiPanel.vue'

/**
 * "Ask AI" in the actions row, opening a side sheet.
 *
 * A sheet rather than a column on the page. The panel was first built into the
 * layout as a permanent third column above 1920px, and it was wrong twice over:
 * it sat visibly empty on any deployment without a key, and it spent width the
 * page would rather give the video. Asking about a video is something you reach
 * for, not something you read alongside — so it gets a trigger, and costs
 * exactly nothing when nobody presses it.
 *
 * The sheet's content is unmounted while closed, which is what keeps the
 * insights request (and its Gemini call) from firing on page load.
 *
 * Renders nothing at all when no key is configured — a permanently disabled
 * button is chrome for every viewer about a decision only the operator can act
 * on. The hint that replaces it is dev-only, where the person reading it is the
 * person who can fix it.
 */
defineProps<{
  target: WatchTarget
  /** Passed straight through — see `WatchAiPanel` for why it's a getter. */
  playhead?: () => number
}>()

const config = useAiConfig()
const enabled = computed(() => config.data.value?.enabled === true)
const tierLabel = computed(() => (config.data.value?.tier === 'pro' ? 'Pro' : 'Free'))

/** Compiled away in production, so the setup hint below ships to nobody. */
const isDev = import.meta.dev
</script>

<template>
  <Sheet v-if="enabled">
    <SheetTrigger as-child>
      <Button type="button" variant="outline" size="sm" class="[&_svg]:size-4">
        <GeminiIcon class="text-primary" />
        Ask AI
      </Button>
    </SheetTrigger>

    <!--
      Full height, and a comfortable reading column on a desktop while staying
      near-full-width on a phone — the conversation is the content, so it wants
      measure, not a drawer you scroll sideways in.
    -->
    <SheetContent
      side="right"
      class="w-full gap-0 overflow-y-auto sm:max-w-md lg:max-w-lg motion-reduce:animate-none"
    >
      <SheetHeader class="gap-1 border-b border-border">
        <SheetTitle class="flex items-center gap-2 text-base">
          <GeminiIcon class="size-4 shrink-0 text-primary" />
          Ask about this video
          <span
            class="ml-auto rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
            :title="`Powered by ${config.data.value?.model}`"
          >
            {{ tierLabel }}
          </span>
        </SheetTitle>
        <SheetDescription class="line-clamp-1 text-xs">
          {{ target.title }} — {{ target.channel }}
        </SheetDescription>
      </SheetHeader>

      <div class="p-4">
        <WatchAiPanel :target="target" :playhead="playhead" />
      </div>
    </SheetContent>
  </Sheet>

  <p
    v-else-if="isDev && config.isFetched.value"
    class="rounded-md border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground"
  >
    AI off — set <code class="font-mono text-foreground">GEMINI_API_KEY</code>
  </p>
</template>
