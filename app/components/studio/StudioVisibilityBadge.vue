<script lang="ts" setup>
import { Eye, EyeOff, Link2 } from '@lucide/vue'
import { VISIBILITY_COPY } from '#shared/utils/studio'
import type { ClipVisibility } from '#shared/types/studio'

/**
 * Who can see a video, as a chip.
 *
 * Icon *and* word, never colour alone — "private" and "public" are the two
 * states a creator most needs to read correctly at a glance, and a red-vs-green
 * dot is exactly the encoding that fails for a colourblind reader (UX:
 * `color-not-only`).
 */
const props = defineProps<{ visibility: ClipVisibility }>()

const ICONS = { private: EyeOff, unlisted: Link2, public: Eye }

const TONES = {
  private: 'border-border bg-surface-3/60 text-muted-foreground',
  unlisted: 'border-warning/30 bg-warning/10 text-warning',
  public: 'border-success/30 bg-success/10 text-success'
}

const label = computed(() => VISIBILITY_COPY[props.visibility].label)
</script>

<template>
  <span
      :class="[
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
      TONES[visibility]
    ]"
  >
    <component :is="ICONS[visibility]" aria-hidden="true" class="size-3.5 stroke-[2]"/>
    {{ label }}
  </span>
</template>
