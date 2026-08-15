<script setup lang="ts">
import { Play, Users } from '@lucide/vue'
import type { ChannelLiveSession } from '#shared/types/channel'
import { Button } from '@/components/ui/button'
import LiveBadge from '@/components/LiveBadge.vue'

/** The session this channel is running right now — the page's loudest element. */
defineProps<{ session: ChannelLiveSession; name: string }>()
</script>

<template>
  <article
    class="group grid gap-5 rounded-2xl border border-border bg-card/40 p-4 sm:grid-cols-[minmax(0,320px)_minmax(0,1fr)] sm:p-5"
  >
    <NuxtLink
      :to="`/watch/${encodeURIComponent(session.slug)}`"
      class="relative block aspect-video overflow-hidden rounded-xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      :aria-label="`Watch ${name} live: ${session.title}`"
    >
      <img
        :src="session.image"
        :alt="`${name} live stream`"
        width="960"
        height="540"
        class="size-full object-cover transition duration-500 group-hover:scale-105"
      />
      <LiveBadge class="absolute left-2 top-2" />
      <span
        class="absolute inset-0 flex items-center justify-center bg-background/40 opacity-0 transition group-hover:opacity-100"
      >
        <span class="flex size-12 items-center justify-center rounded-full bg-foreground text-background">
          <Play class="size-5 fill-current" />
        </span>
      </span>
    </NuxtLink>

    <div class="flex min-w-0 flex-col justify-center gap-3">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        {{ name }} is live
      </p>
      <h3 class="text-lg font-semibold leading-snug text-foreground">{{ session.title }}</h3>
      <p class="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
        <Users class="size-4" aria-hidden="true" />
        {{ session.viewers }}
        <span aria-hidden="true">·</span>
        <span>live for {{ session.uptime }}</span>
        <span aria-hidden="true">·</span>
        <span>{{ session.category }}</span>
      </p>
      <div>
        <Button as-child size="sm">
          <NuxtLink :to="`/watch/${encodeURIComponent(session.slug)}`">Watch now</NuxtLink>
        </Button>
      </div>
    </div>
  </article>
</template>
