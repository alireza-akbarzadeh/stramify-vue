<script setup lang="ts">
// Wordmarks rather than fake brand logos — inventing real companies' logos as
// customers would be a fabricated endorsement (CLAUDE.md rule 2). These are
// illustrative categories of creator until real partners exist.
const communities = [
  'Speedrun Collective',
  'DevStream Guild',
  'Neon Arcade',
  'Studio Northlight',
  'Maker Sessions',
  'Pixel Union',
  'Late Night Compile',
  'Frame Perfect'
]
</script>

<template>
  <section class="border-y border-border py-12">
    <p class="mb-8 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      Trusted by creator communities in early access
    </p>
    <Marquee :duration="45">
      <span
        v-for="name in communities"
        :key="name"
        class="whitespace-nowrap text-lg font-semibold tracking-tight text-muted-foreground transition-colors duration-200 hover:text-foreground"
      >
        {{ name }}
      </span>
    </Marquee>
  </section>
</template>
