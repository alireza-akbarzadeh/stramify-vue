<script lang="ts" setup>
import { ImagePlus } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { IMAGE_RULE } from '#shared/utils/studio'

/**
 * The video's poster: what the wizard captured, and the way to replace it.
 *
 * For a video this arrives already filled — a frame grabbed a tenth of the way
 * in (`app/utils/media-probe.ts`) — so the common path is zero work. For a
 * track, and for any video whose codec the browser wouldn't decode, it starts
 * empty and is the one thing the creator has to supply, which is why the empty
 * state says so rather than looking like an optional extra.
 */
defineProps<{ url: string; captured: boolean }>()

const emit = defineEmits<{ select: [file: File] }>()

const input = useTemplateRef<HTMLInputElement>('input')

function onPick(event: Event) {
  const picked = (event.target as HTMLInputElement).files?.[0]
  if (picked) emit('select', picked)
  if (input.value) input.value.value = ''
}
</script>

<template>
  <div class="grid gap-2">
    <span class="text-sm font-medium text-foreground">
      Thumbnail
      <span v-if="!url" class="text-destructive" aria-hidden="true">*</span>
    </span>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
      <!-- 16:9 and fixed, so the row doesn't reflow when an image loads. -->
      <div
          class="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl border border-border bg-surface-3/60 sm:w-56"
      >
        <img
            v-if="url"
            :src="url"
            alt="Thumbnail preview"
            class="size-full object-cover"
        >
        <span
            v-else
            class="flex size-full items-center justify-center text-xs text-muted-foreground"
        >
          No thumbnail yet
        </span>
      </div>

      <div class="min-w-0 sm:pt-1">
        <label>
          <input
              ref="input"
              :accept="IMAGE_RULE.accept"
              class="sr-only"
              type="file"
              @change="onPick"
          >
          <Button as="span" class="cursor-pointer" size="sm" variant="outline">
            <ImagePlus aria-hidden="true"/>
            {{ url ? 'Replace' : 'Choose an image' }}
          </Button>
        </label>

        <p class="mt-2 text-xs leading-relaxed text-muted-foreground">
          <template v-if="captured">
            Captured from your video. Replace it with your own if you'd rather.
          </template>
          <template v-else>
            {{ IMAGE_RULE.hint }}. This is the image people see everywhere your
            video appears.
          </template>
        </p>
      </div>
    </div>
  </div>
</template>
