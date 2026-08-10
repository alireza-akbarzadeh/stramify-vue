<script setup lang="ts">
import type { Component } from 'vue'
import PopBurst from '@/components/motion/PopBurst.vue'

/**
 * One button of the right-hand rail: a round icon with its count underneath.
 *
 * Five of these make the rail, so the touch target (44px, the platform
 * minimum), the label wiring and the press feedback are defined once here
 * rather than five times. `active` both tints and fills the icon — colour is
 * never the only signal that a like landed.
 */
const props = withDefaults(
  defineProps<{
    icon: Component
    /** Screen-reader name — the visible caption is a count, not a label. */
    label: string
    /** Caption under the icon. Omitted for actions with nothing to count. */
    caption?: string
    active?: boolean
    /** Set for toggles so the state is announced; left undefined for share. */
    pressed?: boolean
    /** Re-runs the pop on change — a boolean for toggles, a counter for share. */
    burst?: boolean | number
    sparks?: number
  }>(),
  { caption: undefined, active: false, pressed: undefined, burst: false, sparks: 6 }
)

const emit = defineEmits<{ (e: 'click'): void }>()
</script>

<template>
  <li class="flex flex-col items-center gap-1">
    <button
      type="button"
      :aria-label="label"
      :aria-pressed="pressed"
      class="grid size-11 cursor-pointer place-items-center rounded-full bg-black/45 text-white backdrop-blur-md transition-colors duration-150 hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 active:scale-95 motion-reduce:active:scale-100"
      @click="emit('click')"
    >
      <PopBurst :trigger="props.burst" :sparks="sparks">
        <component
          :is="icon"
          class="size-6"
          :class="active && 'fill-current text-primary'"
          aria-hidden="true"
        />
      </PopBurst>
    </button>
    <span
      v-if="caption"
      class="text-[11px] font-semibold tabular-nums text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
      aria-hidden="true"
    >
      {{ caption }}
    </span>
  </li>
</template>
