<script setup lang="ts">
import { ArrowUpRight, Radio, Settings2, Users } from '@lucide/vue'

const viewers = [12, 18, 15, 26, 22, 34, 29, 41, 38, 52, 47, 63, 58, 74, 88]

const metrics = [
  { label: 'Avg. concurrent', value: '1,284', delta: '+18.2%' },
  { label: 'Watch time', value: '9,412h', delta: '+24.7%' },
  { label: 'New followers', value: '3,067', delta: '+11.4%' }
]

const upcoming = [
  { title: 'Renderer deep-dive', when: 'Today · 8:00 PM', tag: 'Scheduled' },
  { title: 'Community game night', when: 'Sat · 6:30 PM', tag: 'Scheduled' }
]
</script>

<template>
  <section class="relative overflow-hidden py-24 sm:py-32">
    <div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      <div class="absolute right-[-6%] top-1/4 size-[460px] rounded-full bg-primary/12 blur-[130px]" />
    </div>

    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <Reveal>
        <SectionHeading
          eyebrow="Creator dashboard"
          title="Know what happened, and why"
          subtitle="Go live, configure your stream, and read the numbers that actually change decisions — in one place, without exporting anything."
        />
      </Reveal>

      <Reveal :delay="0.1" :distance="36">
        <GlassPanel class="mt-16 overflow-hidden">
          <!-- Toolbar -->
          <header class="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
            <span class="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Radio class="size-4 text-primary" aria-hidden="true" /> Channel overview
            </span>
            <span class="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground">Last 30 days</span>
            <span class="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              <Settings2 class="size-3.5" aria-hidden="true" /> Stream settings
            </span>
          </header>

          <div class="grid gap-px bg-border sm:grid-cols-3">
            <div v-for="m in metrics" :key="m.label" class="bg-card/60 p-5">
              <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{{ m.label }}</p>
              <p class="mt-2 text-2xl font-semibold tracking-tight text-foreground">{{ m.value }}</p>
              <p class="mt-1 inline-flex items-center gap-1 text-xs font-medium text-success">
                <ArrowUpRight class="size-3.5" aria-hidden="true" />{{ m.delta }}
              </p>
            </div>
          </div>

          <div class="grid gap-px bg-border lg:grid-cols-[1.6fr_1fr]">
            <div class="bg-card/60 p-5">
              <div class="flex items-center justify-between">
                <p class="text-sm font-semibold text-foreground">Concurrent viewers</p>
                <span class="text-xs text-muted-foreground">Peak 2,140</span>
              </div>
              <div class="mt-4">
                <AreaChart :points="viewers" />
              </div>
            </div>

            <div class="bg-card/60 p-5">
              <p class="text-sm font-semibold text-foreground">Upcoming streams</p>
              <ul class="mt-4 space-y-3">
                <li v-for="u in upcoming" :key="u.title" class="rounded-lg border border-border bg-foreground/[0.03] p-3">
                  <p class="text-sm font-medium text-foreground">{{ u.title }}</p>
                  <p class="mt-0.5 text-xs text-muted-foreground">{{ u.when }}</p>
                </li>
              </ul>
              <div class="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Users class="size-3.5" aria-hidden="true" /> 4 moderators active
              </div>
            </div>
          </div>
        </GlassPanel>
      </Reveal>
    </div>
  </section>
</template>
