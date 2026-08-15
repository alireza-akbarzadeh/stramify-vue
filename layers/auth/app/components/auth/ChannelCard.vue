<script setup lang="ts">
defineProps<{ title: string; category: string; viewers: string; tint: string }>()
</script>

<template>
  <!--
    Original artwork built from theme tokens — deliberately not real posters,
    which would be third-party IP we have no licence to ship.
  -->
  <article class="h-full w-full overflow-hidden rounded-xl border border-border bg-surface-2 shadow-[0_24px_60px_-24px_var(--shadow-color)]">
    <div :class="['relative h-3/5 overflow-hidden bg-linear-to-br', tint]">
      <div class="absolute inset-0 bg-[radial-gradient(120%_90%_at_20%_0%,rgba(255,255,255,0.22),transparent_60%)]" />
      <span class="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-foreground">
        <span class="size-1 rounded-full bg-current" />Live
      </span>
    </div>
    <div class="p-2.5">
      <p class="truncate text-[11px] font-semibold text-foreground">{{ title }}</p>
      <p class="mt-0.5 truncate text-[10px] text-muted-foreground">{{ category }}</p>
      <p class="mt-1 text-[10px] font-medium text-primary">{{ viewers }}</p>
    </div>
  </article>
</template>
