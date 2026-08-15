<script lang="ts" setup>
import { Loader2, MonitorUp } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { formatBytes, mediaRuleFor } from '#shared/utils/studio'
import { formatDuration } from '#shared/utils/format'
import type { StudioMediaKind } from '#shared/types/studio'

/**
 * The drop target, and the first thing the wizard shows.
 *
 * Drag-and-drop is the affordance people reach for, but it is never the only
 * one: the whole panel is also a `<label>` for a real file input, so a click,
 * a tap and a keyboard `Enter` all open the picker. A dropzone that only
 * accepts a drag is unusable on a phone and unreachable without a mouse.
 */
const props = defineProps<{
  kind: StudioMediaKind
  file: File | null
  reading: boolean
  durationSeconds: number
}>()

const emit = defineEmits<{ select: [file: File] }>()

const dragging = ref(false)
const input = useTemplateRef<HTMLInputElement>('input')

const rule = computed(() => mediaRuleFor(props.kind))

function onDrop(event: DragEvent) {
  dragging.value = false
  const dropped = event.dataTransfer?.files?.[0]
  if (dropped) emit('select', dropped)
}

function onPick(event: Event) {
  const picked = (event.target as HTMLInputElement).files?.[0]
  if (picked) emit('select', picked)
  // Cleared so re-picking the same file after a rejection still fires `change`.
  if (input.value) input.value.value = ''
}
</script>

<template>
  <div>
    <label
        :class="[
        'flex min-h-56 cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-8 text-center transition-colors duration-200',
        dragging
          ? 'border-primary bg-primary/[0.06]'
          : 'border-border bg-surface-2/40 hover:border-foreground/25 hover:bg-surface-2/70',
        'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background'
      ]"
        @dragleave.prevent="dragging = false"
        @dragover.prevent="dragging = true"
        @drop.prevent="onDrop"
    >
      <input
          ref="input"
          :accept="rule.accept"
          class="sr-only"
          type="file"
          @change="onPick"
      >

      <span
          aria-hidden="true"
          class="grid size-14 place-items-center rounded-2xl bg-surface-3/70 text-muted-foreground"
      >
        <Loader2 v-if="reading" class="size-6 animate-spin stroke-[1.8]"/>
        <MonitorUp v-else class="size-6 stroke-[1.8]"/>
      </span>

      <span v-if="reading" class="text-sm font-medium text-foreground">
        Reading the file…
      </span>

      <!--
        Once a file is chosen the panel becomes its summary rather than
        emptying — the creator can see what they picked, and clicking still
        swaps it, so there's no separate "remove" step to find.
      -->
      <span v-else-if="file" class="min-w-0">
        <span class="block truncate text-sm font-semibold text-foreground">{{ file.name }}</span>
        <span class="mt-1 block text-xs text-muted-foreground">
          {{ formatBytes(file.size) }}
          <template v-if="durationSeconds"> · {{ formatDuration(durationSeconds) }}</template>
        </span>
        <Button as="span" class="mt-4" size="sm" variant="outline">Choose a different file</Button>
      </span>

      <span v-else>
        <span class="block text-sm font-semibold text-foreground">
          Drag {{ kind === 'music' ? 'an audio file' : 'a video' }} here, or click to browse
        </span>
        <span class="mt-1 block text-xs text-muted-foreground">{{ rule.hint }}</span>
      </span>
    </label>

    <!--
      Stated up front rather than after a failed publish. Nothing has been sent
      anywhere yet, and saying so is the honest answer to the question a
      creator actually has at this point.
    -->
    <p class="mt-3 text-xs leading-relaxed text-muted-foreground">
      Nothing is uploaded until you publish — you can change every detail first.
    </p>
  </div>
</template>
