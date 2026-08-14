<script lang="ts" setup>
/**
 * The transfer bar.
 *
 * `role="progressbar"` with real `aria-value*` attributes rather than a styled
 * div, so a screen reader can answer "how far along is this" — during a
 * multi-minute upload that's the only question there is.
 *
 * The fill animates with `transform`, not `width`: a bar that lays out its
 * parent on every progress event is the one piece of this screen guaranteed to
 * be repainting constantly (UX: `transform-performance`).
 */
const props = defineProps<{ percent: number; label: string }>()

const clamped = computed(() => Math.min(100, Math.max(0, Math.round(props.percent))))
</script>

<template>
  <div class="grid gap-2">
    <div class="flex items-center justify-between text-sm">
      <span class="font-medium text-foreground">{{ label }}</span>
      <span class="tabular-nums text-muted-foreground">{{ clamped }}%</span>
    </div>

    <div
        :aria-valuenow="clamped"
        aria-valuemax="100"
        aria-valuemin="0"
        class="h-2 overflow-hidden rounded-full bg-surface-3"
        role="progressbar"
    >
      <div
          :style="{ transform: `scaleX(${clamped / 100})` }"
          class="h-full origin-left rounded-full bg-gradient-to-r from-primary to-secondary transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
      />
    </div>

    <!--
      100% means the bytes have arrived, not that the request is done — the
      server still has to write two objects and insert the row. Saying so
      stops the bar looking stuck at the finish line.
    -->
    <p v-if="clamped === 100" class="text-xs text-muted-foreground">
      Upload complete — finishing up…
    </p>
  </div>
</template>
