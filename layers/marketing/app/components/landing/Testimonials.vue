<script setup lang="ts">
import { Quote } from '@lucide/vue'

/**
 * PLACEHOLDER CONTENT — these are illustrative, not real quotes from real
 * people, and the section is labelled as early-access feedback rather than
 * customer endorsements. Replace with attributed, consented quotes before
 * this page goes to production; do not ship invented praise as genuine.
 */
const notes = [
  {
    quote: 'Setup took one paste of the ingest URL into OBS. The part I actually care about — chat not falling over when a raid lands — just worked.',
    name: 'Early access creator',
    detail: 'Software & game dev · ~2K avg viewers',
    accent: 'from-primary/25'
  },
  {
    quote: 'Moderation being server-side matters. Bans stick immediately instead of the banned account posting three more times before it catches up.',
    name: 'Early access moderator',
    detail: 'Community of 40K followers',
    accent: 'from-secondary/25'
  },
  {
    quote: 'The dashboard tells me which streams grew the channel instead of making me export a CSV and work it out myself.',
    name: 'Early access creator',
    detail: 'Music & production',
    accent: 'from-accent/25'
  }
]
</script>

<template>
  <section class="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
    <Reveal>
      <SectionHeading
        eyebrow="Early access"
        title="What the first creators told us"
        subtitle="Feedback gathered during the private beta. Names are withheld until we have permission to publish them."
      />
    </Reveal>

    <div class="mt-16 grid gap-5 lg:grid-cols-3">
      <Reveal v-for="(n, i) in notes" :key="n.name + i" class="h-full" :delay="i * 0.08">
        <figure class="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card/60 p-7 backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-foreground/20 hover:shadow-[0_28px_60px_-24px_var(--shadow-color)]">
          <div :class="['pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b to-transparent opacity-70', n.accent]" aria-hidden="true" />
          <Quote class="relative size-6 text-primary" aria-hidden="true" />
          <blockquote class="relative mb-6 mt-4 text-pretty text-[15px] leading-relaxed text-foreground">
            {{ n.quote }}
          </blockquote>
          <figcaption class="relative mt-auto flex items-center gap-3 border-t border-border pt-5">
            <span class="size-9 shrink-0 rounded-full bg-linear-to-br from-primary to-secondary" aria-hidden="true" />
            <span>
              <span class="block text-sm font-medium text-foreground">{{ n.name }}</span>
              <span class="block text-xs text-muted-foreground">{{ n.detail }}</span>
            </span>
          </figcaption>
        </figure>
      </Reveal>
    </div>
  </section>
</template>
