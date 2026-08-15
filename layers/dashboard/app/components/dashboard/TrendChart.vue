<script setup lang="ts">
import type { TrendSeries } from '#shared/types/dashboard'

const props = defineProps<{ series: TrendSeries }>()

/** viewBox units. The SVG scales with `w-full h-auto`, so these are ratios. */
const WIDTH = 600
const HEIGHT = 160
const PAD_Y = 8

const peak = computed(() => Math.max(...props.series.points.map((p) => p.value), 0))

/** x/y in viewBox space. A flat (all-zero) series sits on the baseline. */
const coords = computed(() => {
  const points = props.series.points
  if (points.length === 0) return []
  const step = points.length === 1 ? 0 : WIDTH / (points.length - 1)
  const usable = HEIGHT - PAD_Y * 2
  return points.map((point, i) => ({
    x: points.length === 1 ? WIDTH / 2 : i * step,
    y: peak.value === 0 ? HEIGHT - PAD_Y : HEIGHT - PAD_Y - (point.value / peak.value) * usable,
    ...point
  }))
})

const linePath = computed(() =>
  coords.value.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
)

/** The line closed down to the baseline, so it can be filled. */
const areaPath = computed(() => {
  const c = coords.value
  if (c.length === 0) return ''
  return `${linePath.value} L${(c.at(-1)?.x ?? 0).toFixed(1)} ${HEIGHT} L${(c[0]?.x ?? 0).toFixed(1)} ${HEIGHT} Z`
})

const firstDate = computed(() => props.series.points[0]?.date ?? '')
const lastDate = computed(() => props.series.points.at(-1)?.date ?? '')

const summary = computed(
  () => `${props.series.label}: ${props.series.total} across ${props.series.points.length} days, peak ${peak.value} in one day.`
)

/** Unique gradient id — two charts on one page must not share a <defs> id. */
const gradientId = useId()
</script>

<template>
  <div>
    <div class="flex items-baseline justify-between gap-4">
      <div>
        <p class="text-sm text-muted-foreground">{{ series.label }}</p>
        <p class="text-2xl font-semibold tabular-nums text-foreground">{{ series.total }}</p>
      </div>
      <p class="text-xs text-muted-foreground">Peak {{ peak }}/day</p>
    </div>

    <svg
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      class="mt-4 h-auto w-full"
      preserveAspectRatio="none"
      role="img"
      :aria-label="summary"
    >
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.28" />
          <stop offset="100%" stop-color="var(--primary)" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- Baseline, so an all-zero window still reads as an axis rather than
           an empty box. -->
      <line
        :x1="0"
        :y1="HEIGHT - PAD_Y"
        :x2="WIDTH"
        :y2="HEIGHT - PAD_Y"
        stroke="var(--border)"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />
      <path v-if="areaPath" :d="areaPath" :fill="`url(#${gradientId})`" />
      <path
        v-if="linePath"
        :d="linePath"
        fill="none"
        stroke="var(--primary)"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
        vector-effect="non-scaling-stroke"
      />
    </svg>

    <div class="mt-2 flex justify-between text-[11px] tabular-nums text-muted-foreground">
      <span>{{ firstDate }}</span>
      <span>{{ lastDate }}</span>
    </div>
  </div>
</template>
