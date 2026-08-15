<script setup lang="ts">
import { Eye, Signal, Users } from '@lucide/vue'
// Relative, not `@/composables/...`: inside a layer the `~`/`@` aliases
// resolve against the root project, which no longer holds this composable.
import { usePointerParallax } from '../../composables/usePointerParallax'

const stage = ref<HTMLElement | null>(null)
const { onMove, reset, layer } = usePointerParallax(stage)

const chat = [
  { user: 'nova_dev', color: '#22d3ee', text: 'the latency on this is unreal' },
  { user: 'kaito', color: '#7c5cff', text: 'what encoder are you running?' },
  { user: 'mira', color: '#ff4b6e', text: 'first time catching you live!' },
  { user: 'sol', color: '#22c55e', text: 'clip that' }
]
</script>

<template>
  <div
    ref="stage"
    class="relative mx-auto w-full max-w-[520px] [perspective:1600px]"
    @mousemove="onMove"
    @mouseleave="reset"
  >
    <!-- Main player -->
    <GlassPanel
      class="relative overflow-hidden transition-transform duration-300 ease-out [transform:rotateY(-9deg)_rotateX(4deg)]"
      :style="layer(14)"
    >
      <div class="relative aspect-video overflow-hidden rounded-t-2xl bg-surface-3">
        <div class="absolute inset-0 bg-[radial-gradient(120%_100%_at_20%_0%,color-mix(in_oklab,var(--secondary)_45%,transparent),transparent_60%),radial-gradient(90%_90%_at_100%_100%,color-mix(in_oklab,var(--primary)_40%,transparent),transparent_65%)]" />
        <div class="absolute left-3 top-3 flex items-center gap-2">
          <LiveBadge />
          <span class="inline-flex items-center gap-1 rounded-md bg-black/45 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
            <Eye class="size-3" aria-hidden="true" /> 12,847
          </span>
        </div>
        <div class="absolute inset-x-0 bottom-0 h-1 bg-white/15">
          <div class="h-full w-2/3 bg-primary" />
        </div>
      </div>

      <div class="flex items-center gap-3 p-4">
        <div class="size-9 shrink-0 rounded-full bg-gradient-to-br from-primary to-secondary" aria-hidden="true" />
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-foreground">Building a renderer from scratch</p>
          <p class="truncate text-xs text-muted-foreground">@novadev · Software &amp; Game Dev</p>
        </div>
      </div>
    </GlassPanel>

    <!-- Floating chat -->
    <GlassPanel
      class="absolute -right-10 top-10 hidden w-56 p-3 lg:block animate-[float-slow_7s_ease-in-out_infinite] motion-reduce:animate-none"
      :style="layer(32)"
    >
      <p class="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Stream chat</p>
      <div class="space-y-2">
        <ChatMessageRow v-for="m in chat" :key="m.user" v-bind="m" />
      </div>
    </GlassPanel>

    <!-- Floating health stat -->
    <GlassPanel
      class="absolute bottom-24 -left-14 hidden w-44 p-3.5 lg:block animate-[float-slow_9s_ease-in-out_infinite_reverse] motion-reduce:animate-none"
      :style="layer(46)"
    >
      <div class="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Signal class="size-3.5 text-success" aria-hidden="true" /> Stream health
      </div>
      <p class="mt-1 text-lg font-semibold text-foreground">Excellent</p>
      <div class="mt-2 flex items-end gap-1" aria-hidden="true">
        <span v-for="(h, i) in [40, 62, 48, 78, 56, 88, 70]" :key="i" class="w-full rounded-sm bg-success/70" :style="{ height: `${h * 0.28}px` }" />
      </div>
    </GlassPanel>

    <!-- Floating followers pill -->
    <GlassPanel class="absolute -bottom-7 right-6 hidden items-center gap-2 px-3.5 py-2.5 lg:flex" :style="layer(58)">
      <Users class="size-4 text-secondary" aria-hidden="true" />
      <span class="text-sm font-semibold text-foreground">+312</span>
      <span class="text-xs text-muted-foreground">followers today</span>
    </GlassPanel>
  </div>
</template>
