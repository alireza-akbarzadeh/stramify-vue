<script setup lang="ts">
// Targets, not claims of current scale — this is an early-access product, so
// these are stated as the engineering targets they are (CLAUDE.md rule 2).
const stats = [
  { to: 99.9, decimals: 1, suffix: '%', label: 'Playback uptime target' },
  { to: 800, suffix: 'ms', label: 'Glass-to-glass with WHIP' },
  { to: 4, suffix: 'K60', label: 'Max ingest quality' },
  { to: 100, suffix: 'ms', label: 'Chat delivery target' }
]
</script>

<template>
  <section class="border-y border-border bg-foreground/[0.02]">
    <div class="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
      <Reveal v-for="(s, i) in stats" :key="s.label" :delay="i * 0.06">
        <p class="text-4xl font-semibold tracking-tight text-foreground">
          <CountUp :to="s.to" :decimals="s.decimals ?? 0" :suffix="s.suffix" />
        </p>
        <p class="mt-2 text-sm text-muted-foreground">{{ s.label }}</p>
      </Reveal>
    </div>
  </section>
</template>
