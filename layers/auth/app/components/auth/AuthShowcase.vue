<script lang="ts" setup>
import {Download, MonitorPlay, Sparkles} from '@lucide/vue'

const features = [
  {icon: MonitorPlay, title: 'Premium streaming', body: '4K60 ingest with adaptive playback'},
  {icon: Download, title: 'Every stream saved', body: 'Automatic VOD and one-click clips'},
  {icon: Sparkles, title: 'Built for creators', body: 'Chat, moderation and analytics included'}
]
</script>

<template>
  <!--
    The persuasion column, shown opposite the form from `lg` up.

    It used to carry a 3D `ChannelCarousel` — a spinning cylinder of channel
    cards — layered behind this copy at opacity-25. It was removed rather than
    repositioned: the left column is ~640px at `lg` and the copy already claims
    `max-w-md` of it, so there was no placement that worked. Behind the text it
    put legible card titles ("Building a renderer", "12.8K watching") across the
    headline; anchored bottom it hung off the viewport as a lone half-card;
    bled off the right it was hard-cropped mid-card by the column's
    `overflow-hidden`. It also ran a permanent 3D transform on the one screen
    where the user's attention belongs on a form.

    `justify-center` on the inner block rather than `justify-between` on the
    column: the latter pinned the testimonial to the bottom of a full-height
    column and left a dead band in the middle at common desktop heights.

    The wordmark is here because `AuthLayout`'s copy of it is `lg:hidden` — so
    from `lg` up the sign-in screen carried no logo at all. On an auth page
    that is not just branding: the wordmark is the cue that tells someone they
    are typing a password into the site they think they are.
  -->
  <div class="relative hidden flex-col overflow-hidden p-10 lg:flex xl:p-14">
    <BrandMark/>

    <div class="flex flex-1 flex-col justify-center gap-12 xl:gap-14">
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
        <ul class="space-y-5">
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
  </div>
</template>
