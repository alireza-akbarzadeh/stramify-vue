<script setup lang="ts">
const props = withDefaults(defineProps<{ points: number[]; height?: number }>(), { height: 120 })

const WIDTH = 320
const max = computed(() => Math.max(...props.points))

/** Maps values to an SVG polyline across a fixed 320-wide viewBox. */
const coords = computed(() =>
  props.points.map((value, index) => ({
    x: (index / (props.points.length - 1)) * WIDTH,
    y: props.height - (value / max.value) * (props.height - 8) - 4
  }))
)

const line = computed(() => coords.value.map((p) => `${p.x},${p.y}`).join(' '))
const area = computed(() => `0,${props.height} ${line.value} ${WIDTH},${props.height}`)
</script>

<template>
  <svg :viewBox="`0 0 ${WIDTH} ${height}`" class="w-full" preserveAspectRatio="none" role="img" aria-label="Concurrent viewers trending upward over the last 30 days">
    <defs>
      <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.35" />
        <stop offset="100%" stop-color="var(--primary)" stop-opacity="0" />
      </linearGradient>
    </defs>
    <polygon :points="area" fill="url(#area-fill)" />
    <polyline :points="line" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
  </svg>
</template>
