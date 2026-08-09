<script lang="ts" setup>
import {Download, MonitorPlay, Sparkles} from '@lucide/vue'

const features = [
  {icon: MonitorPlay, title: 'Premium streaming', body: '4K60 ingest with adaptive playback'},
  {icon: Download, title: 'Every stream saved', body: 'Automatic VOD and one-click clips'},
  {icon: Sparkles, title: 'Built for creators', body: 'Chat, moderation and analytics included'}
]
</script>

<template>
  <div class="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14 lg:mt-9">

    <div class="relative isolate py-10">
      <!--
        Carousel sits behind the copy, dimmed so the text keeps contrast.
        `isolate` on the parent scopes the negative z-index to this stacking
        context — without it the layer drops behind the page background and
        disappears entirely.
      -->
      <div
          class="pointer-events-none absolute inset-0 -z-10 flex translate-x-28 items-center justify-center opacity-25">
        <ChannelCarousel/>
      </div>

      <Reveal>
        <h1 class="max-w-md text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-foreground xl:text-5xl">
          All your streaming.
          <span class="block bg-linear-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            One platform.
          </span>
        </h1>
        <p class="mt-5 max-w-sm text-pretty leading-relaxed text-muted-foreground">
          Go live, grow an audience, and keep every moment — without running any infrastructure.
        </p>
      </Reveal>

      <Reveal :delay="0.1">
        <ul class="mt-9 space-y-5">
          <li v-for="f in features" :key="f.title" class="flex items-start gap-3.5">
            <span
                class="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-glass text-primary backdrop-blur">
              <component :is="f.icon" aria-hidden="true" class="size-5"/>
            </span>
            <span>
              <span class="block text-sm font-semibold text-foreground">{{ f.title }}</span>
              <span class="block text-sm text-muted-foreground">{{ f.body }}</span>
            </span>
          </li>
        </ul>
      </Reveal>
    </div>

    <Reveal :delay="0.16">
      <figure class="max-w-sm rounded-2xl border border-border bg-glass p-5 backdrop-blur-xl">
        <blockquote class="text-sm leading-relaxed text-foreground">
          “Setup took one paste of the ingest URL into OBS. Chat didn't fall over when a raid
          landed — that's the part I actually cared about.”
        </blockquote>
        <figcaption class="mt-3 text-xs text-muted-foreground">
          Early access creator · feedback from the private beta
        </figcaption>
      </figure>
    </Reveal>
  </div>
</template>
