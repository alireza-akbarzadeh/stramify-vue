<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { ArrowRight, Play } from '@lucide/vue'
</script>

<template>
  <section class="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
    <!-- Ambient light + grid -->
    <div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      <div
        class="absolute left-1/2 top-[-18%] size-180 -translate-x-1/2 rounded-full bg-primary/18 blur-[140px]"
      />
      <div
        class="absolute right-[-10%] top-1/4 size-130 rounded-full bg-secondary/18 blur-[130px]"
      />
      <div
        class="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[64px_64px] mask-[radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
      />
    </div>

    <div
      class="mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:px-8"
    >
      <div>
        <Reveal>
          <NuxtLink
            to="/live"
            class="inline-flex items-center gap-2 rounded-full border border-border bg-glass px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              class="size-1.5 rounded-full bg-primary animate-[pulse-ring_2s_ease-out_infinite] motion-reduce:animate-none"
              aria-hidden="true"
            />
            Now in early access
            <ArrowRight class="size-3" aria-hidden="true" />
          </NuxtLink>
        </Reveal>

        <Reveal :delay="0.06">
          <h1
            class="mt-7 text-balance text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-[4.25rem]"
          >
            Go live in seconds.<br />
            <span
              class="bg-linear-to-r from-primary via-secondary to-accent bg-clip-text text-transparent"
            >
              Built for creators who move fast.
            </span>
          </h1>
        </Reveal>

        <Reveal :delay="0.12">
          <p class="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Sub-second ingest, adaptive playback, real-time chat with moderation built in, and a
            creator dashboard that respects your time. No infrastructure to run.
          </p>
        </Reveal>

        <Reveal :delay="0.18">
          <div class="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Magnetic>
              <Button as-child size="lg">
                <NuxtLink to="/signup">Start streaming free <ArrowRight class="size-4" /></NuxtLink>
              </Button>
            </Magnetic>
            <Magnetic>
              <Button as-child size="lg" variant="outline">
                <NuxtLink to="/live"><Play class="size-4" /> Watch a live channel</NuxtLink>
              </Button>
            </Magnetic>
          </div>
          <p class="mt-4 text-sm text-muted-foreground">Free to start · No credit card required</p>
        </Reveal>
      </div>

      <Reveal :delay="0.24" :distance="36">
        <HeroStudio />
      </Reveal>
    </div>
  </section>
</template>
