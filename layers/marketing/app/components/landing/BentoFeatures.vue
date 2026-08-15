<script setup lang="ts">
import {
  Radio,
  MessagesSquare,
  Scissors,
  BarChart3,
  ShieldCheck,
  Gauge,
  Smartphone,
  Layers
} from '@lucide/vue'
</script>

<template>
  <section id="features" class="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
    <Reveal>
      <SectionHeading
        eyebrow="Everything included"
        title="The whole stack a stream needs"
        subtitle="No plugins to bolt on, no second dashboard to check. Ingest, playback, chat, moderation, clips and analytics ship together."
      />
    </Reveal>

    <div class="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Reveal class="h-full sm:col-span-2" :delay="0.04">
        <BentoCard
          :icon="Radio"
          title="Sub-second ingest"
          body="RTMPS today, WHIP/WHEP for sub-second glass-to-glass latency. Adaptive bitrate ladders are generated automatically — your viewers get the best quality their connection allows."
          class="h-full"
        >
          <div class="mt-5 flex flex-wrap gap-2">
            <span v-for="p in ['RTMPS', 'WHIP', 'HLS', 'WHEP', 'ABR']" :key="p" class="rounded-md border border-border bg-foreground/5 px-2 py-1 font-mono text-[11px] text-muted-foreground">
              {{ p }}
            </span>
          </div>
        </BentoCard>
      </Reveal>

      <Reveal class="h-full" :delay="0.08">
        <BentoCard :icon="MessagesSquare" title="Real-time chat" body="Sub-100ms delivery, reconnect handling, and message history that survives a refresh." class="h-full" />
      </Reveal>

      <Reveal class="h-full" :delay="0.12">
        <BentoCard :icon="ShieldCheck" title="Moderation built in" body="Slow mode, subscriber-only, bans, timeouts and per-channel moderators — enforced server-side." class="h-full" />
      </Reveal>

      <Reveal class="h-full" :delay="0.16">
        <BentoCard :icon="Scissors" title="Clips &amp; VOD" body="Every broadcast records automatically. Clip any moment and share it in two clicks." class="h-full" />
      </Reveal>

      <Reveal class="h-full" :delay="0.2">
        <BentoCard :icon="Gauge" title="Stream health" body="Live bitrate, dropped frames and encoder warnings, surfaced before your viewers notice." class="h-full" />
      </Reveal>

      <Reveal class="h-full sm:col-span-2" :delay="0.24">
        <BentoCard
          :icon="BarChart3"
          title="Analytics that answer questions"
          body="Concurrent viewers, watch time, follower growth and traffic sources — charted so you can actually read them, not exported to a spreadsheet."
          class="h-full"
        >
          <div class="mt-5 flex h-20 items-end gap-1" aria-hidden="true">
            <span
              v-for="(h, i) in [28, 34, 30, 44, 38, 52, 46, 41, 58, 50, 64, 57, 71, 63, 78, 69, 84, 76, 91, 82, 96, 88, 100, 93]"
              :key="i"
              class="w-full rounded-sm bg-linear-to-t from-primary/15 to-primary/80"
              :style="{ height: `${h}%` }"
            />
          </div>
        </BentoCard>
      </Reveal>

      <Reveal class="h-full" :delay="0.28">
        <BentoCard :icon="Smartphone" title="Real mobile" body="A player and chat redesigned for touch — not a desktop layout squeezed onto a phone." class="h-full" />
      </Reveal>

      <Reveal class="h-full sm:col-span-2 lg:col-span-3" :delay="0.32">
        <BentoCard
          :icon="Layers"
          title="A player people actually want to watch in"
          body="Theater mode, picture-in-picture, captions, playback speed, quality selection and keyboard shortcuts — with buffering, offline and stream-ended states designed rather than defaulted."
          class="h-full"
        >
          <div class="mt-5 flex flex-wrap gap-2">
            <span
              v-for="c in ['Theater', 'PiP', 'Captions', '0.5×–2×', 'Quality', 'Shortcuts', 'Fullscreen']"
              :key="c"
              class="rounded-md border border-border bg-foreground/5 px-2.5 py-1 text-xs text-muted-foreground"
            >
              {{ c }}
            </span>
          </div>
        </BentoCard>
      </Reveal>
    </div>
  </section>
</template>
