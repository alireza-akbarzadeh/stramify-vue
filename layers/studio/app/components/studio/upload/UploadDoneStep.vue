<script lang="ts" setup>
import { Check, Copy, ExternalLink } from '@lucide/vue'
import StudioVisibilityBadge from '../StudioVisibilityBadge.vue'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { formatDuration } from '#shared/utils/format'
import type { StudioVideo } from '#shared/types/studio'

/**
 * The end of the flow.
 *
 * Three exits rather than one, because "published" is the start of three
 * different intentions: watch it, tell someone about it, or upload the next
 * one. A success screen whose only affordance is "OK" makes all three a
 * navigation puzzle.
 *
 * The share row is shown for unlisted uploads too — an unlisted video's link
 * *is* how it's distributed, so this is the moment it's most wanted. For a
 * private one it's hidden: the link resolves for nobody but its owner, and
 * offering it to copy would be offering something that doesn't work.
 */
const props = defineProps<{ video: StudioVideo }>()

const emit = defineEmits<{ again: [] }>()

const watchPath = computed(() => `/watch/${encodeURIComponent(props.video.id)}`)

async function copyLink() {
  try {
    await navigator.clipboard.writeText(new URL(watchPath.value, window.location.origin).href)
    toast.success('Link copied')
  } catch {
    // Clipboard access is refusable and is refused in some embedded browsers.
    toast.error('Could not copy the link')
  }
}
</script>

<template>
  <div class="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
    <span
        aria-hidden="true"
        class="grid size-12 place-items-center rounded-2xl bg-success/12 text-success"
    >
      <Check class="size-6 stroke-[2.4]"/>
    </span>

    <div class="min-w-0">
      <h2 class="text-lg font-semibold text-foreground">
        {{ video.title }} is {{ video.visibility === 'public' ? 'live' : 'saved' }}
      </h2>
      <p class="mt-1 text-sm text-muted-foreground">
        <template v-if="video.visibility === 'public'">
          It's on your channel and in the feeds now.
        </template>
        <template v-else-if="video.visibility === 'unlisted'">
          Anyone with the link can watch it. It won't show up in search or browse.
        </template>
        <template v-else>
          Only you can see it. Publish it from your content list whenever you're ready.
        </template>
      </p>

      <div class="mt-4 flex flex-wrap items-center gap-2">
        <StudioVisibilityBadge :visibility="video.visibility"/>
        <span class="text-xs tabular-nums text-muted-foreground">
          {{ video.durationSeconds ? formatDuration(video.durationSeconds) : '—' }}
        </span>
      </div>

      <div class="mt-6 flex flex-wrap gap-2">
        <Button :to="watchPath" as-child>
          <NuxtLink :to="watchPath">
            <ExternalLink aria-hidden="true"/>
            Watch it
          </NuxtLink>
        </Button>

        <Button v-if="video.visibility !== 'private'" variant="outline" @click="copyLink">
          <Copy aria-hidden="true"/>
          Copy link
        </Button>

        <Button variant="ghost" @click="emit('again')">Upload another</Button>
      </div>
    </div>
  </div>
</template>
