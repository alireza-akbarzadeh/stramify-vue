<script setup lang="ts">
import { useElementVisibility } from '@vueuse/core'
import { Ban, Clock, Crown, ShieldCheck } from '@lucide/vue'
// Relative, not `@/composables/...`: inside a layer the `~`/`@` aliases
// resolve against the root project, which no longer holds this composable.
import { useTickingList } from '../../composables/useTickingList'

const panel = ref<HTMLElement | null>(null)
const active = useElementVisibility(panel)

const messages = [
  { user: 'nova_dev', color: '#22d3ee', text: 'the latency on this is unreal', badge: '' },
  { user: 'kaito', color: '#7c5cff', text: 'what encoder are you running?', badge: '' },
  { user: 'mira', color: '#ff4b6e', text: 'first time catching you live!', badge: 'sub' },
  { user: 'blessed', color: '#f59e0b', text: 'FREE CRYPTO >> scam-link.example', badge: 'removed' },
  { user: 'sol', color: '#22c55e', text: 'clip that', badge: 'mod' },
  { user: 'ren', color: '#22d3ee', text: 'the chat never lags, how', badge: '' }
]

const { visible } = useTickingList(messages, active, 1400)

const controls = [
  { icon: Clock, label: 'Slow mode', value: '3s' },
  { icon: Crown, label: 'Subs only', value: 'Off' },
  { icon: ShieldCheck, label: 'Moderators', value: '4' },
  { icon: Ban, label: 'Banned', value: '12' }
]
</script>

<template>
  <section class="relative overflow-hidden py-24 sm:py-32">
    <div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      <div class="absolute left-[-8%] top-1/3 size-[440px] rounded-full bg-secondary/15 blur-[130px]" />
    </div>

    <div class="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
      <Reveal>
        <SectionHeading
          align="left"
          eyebrow="Live chat"
          title="Chat that scales past the first thousand"
          subtitle="Messages fan out through Redis, so a channel with ten viewers and one with fifty thousand behave the same. Moderation runs server-side — a ban takes effect on the next message, not the next page load."
        />
        <ul class="mt-8 space-y-3">
          <li v-for="c in controls" :key="c.label" class="flex items-center gap-3 text-sm">
            <span class="grid size-8 place-items-center rounded-lg border border-border bg-foreground/5 text-primary">
              <component :is="c.icon" class="size-4" aria-hidden="true" />
            </span>
            <span class="text-foreground">{{ c.label }}</span>
            <span class="ml-auto font-mono text-xs text-muted-foreground">{{ c.value }}</span>
          </li>
        </ul>
      </Reveal>

      <Reveal :delay="0.1" :distance="32">
        <div ref="panel">
        <GlassPanel class="overflow-hidden">
          <header class="flex items-center justify-between border-b border-border px-4 py-3">
            <span class="text-sm font-semibold text-foreground">Stream chat</span>
            <LiveBadge />
          </header>

          <div class="flex min-h-56 flex-col justify-end gap-2.5 p-4">
            <TransitionGroup
              enter-active-class="transition-all duration-500 ease-out"
              enter-from-class="opacity-0 translate-y-2"
              move-class="transition-transform duration-500 ease-out"
            >
              <div v-for="m in visible" :key="m.user" class="flex items-start gap-2 text-sm">
                <span class="shrink-0 font-semibold" :style="{ color: m.color }">{{ m.user }}</span>
                <span v-if="m.badge === 'removed'" class="italic text-muted-foreground/70">
                  message removed by AutoMod
                </span>
                <span v-else class="text-muted-foreground">{{ m.text }}</span>
                <span
                  v-if="m.badge && m.badge !== 'removed'"
                  class="ml-auto shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground"
                >
                  {{ m.badge }}
                </span>
              </div>
            </TransitionGroup>
          </div>

          <div class="border-t border-border p-3">
            <div class="flex items-center gap-2 rounded-lg border border-border bg-foreground/5 px-3 py-2 text-sm text-muted-foreground">
              Send a message
              <span class="ml-auto text-[11px]">Slow mode · 3s</span>
            </div>
          </div>
        </GlassPanel>
        </div>
      </Reveal>
    </div>
  </section>
</template>
