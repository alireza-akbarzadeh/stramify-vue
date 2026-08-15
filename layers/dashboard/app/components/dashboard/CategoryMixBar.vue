<script setup lang="ts">
import type { CategoryShare } from '#shared/types/dashboard'

defineProps<{ mix: CategoryShare[] }>()

/** Fixed per-category colours so the bar and the legend always agree. */
const TINT: Record<string, string> = {
  Music: 'var(--primary)',
  Gaming: 'var(--secondary)',
  Creative: 'var(--warning)'
}
</script>

<template>
  <div class="rounded-2xl border border-border bg-card p-5">
    <h3 class="text-base font-semibold text-foreground">Category mix</h3>
    <p class="mt-0.5 text-xs text-muted-foreground">How your published clips split across categories.</p>

    <p v-if="mix.length === 0" class="py-6 text-center text-sm text-muted-foreground">
      Nothing published yet.
    </p>

    <template v-else>
      <div class="mt-5 flex h-3 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        <div
          v-for="share in mix"
          :key="share.category"
          class="h-full transition-[width] duration-500"
          :style="{ width: `${share.percent}%`, background: TINT[share.category] ?? 'var(--muted-foreground)' }"
        />
      </div>

      <ul class="mt-4 flex flex-col gap-2">
        <li v-for="share in mix" :key="share.category" class="flex items-center gap-3 text-sm">
          <span
            class="size-2.5 shrink-0 rounded-full"
            :style="{ background: TINT[share.category] ?? 'var(--muted-foreground)' }"
            aria-hidden="true"
          />
          <span class="flex-1 text-foreground">{{ share.category }}</span>
          <span class="tabular-nums text-muted-foreground">
            {{ share.clips }} {{ share.clips === 1 ? 'clip' : 'clips' }} · {{ share.percent }}%
          </span>
        </li>
      </ul>
    </template>
  </div>
</template>
