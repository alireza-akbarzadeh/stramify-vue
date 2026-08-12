<script setup lang="ts">
import { ListVideo, Play } from '@lucide/vue'
import { useWatchPlaylist } from '@/composables/useWatchPlaylist'

/**
 * The playlist queue on the watch page, above "Up next".
 *
 * Renders nothing unless the URL carries `?list=` — the page is otherwise
 * exactly as it was. Owns its own query rather than taking props, for the same
 * reason `WatchSaveToPlaylist` does: nothing else in the layout needs it, and
 * threading it through would mean a prop on every level down from `WatchView`.
 *
 * The list scrolls inside a fixed height instead of pushing "Up next" off the
 * screen, and the playing row is marked with `aria-current` as well as a colour
 * change, so it isn't announced by position alone.
 */
const props = defineProps<{ slug: string }>()

const { active, playlist, items, index, hrefFor, isPending } = useWatchPlaylist(() => props.slug)

/** 1-based, and clamped: a clip that isn't in the list reads as "1 / N", not "0 / N". */
const position = computed(() => Math.max(index.value, 0) + 1)
</script>

<template>
  <section v-if="active" aria-labelledby="playlist-queue-heading">
    <div class="overflow-hidden rounded-xl border border-border">
      <div class="border-b border-border bg-surface-2 px-4 py-3">
        <h2
          id="playlist-queue-heading"
          class="flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          <ListVideo class="size-4 shrink-0" aria-hidden="true" />
          <span class="truncate">{{ playlist?.title ?? 'Playlist' }}</span>
        </h2>
        <p class="mt-1 text-xs text-muted-foreground">
          <template v-if="isPending">Loading…</template>
          <template v-else>{{ position }} / {{ items.length }}</template>
        </p>
      </div>

      <div v-if="isPending" class="space-y-3 p-3">
        <div v-for="n in 4" :key="n" class="flex gap-3">
          <div class="aspect-video w-24 shrink-0 animate-pulse rounded bg-muted" />
          <div class="flex-1 space-y-2 py-1">
            <div class="h-3 w-full animate-pulse rounded bg-muted" />
            <div class="h-3 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>

      <p v-else-if="!items.length" class="p-4 text-sm text-muted-foreground">
        This playlist is empty.
      </p>

      <ol v-else class="max-h-96 overflow-y-auto p-1">
        <li v-for="(item, slot) in items" :key="item.id">
          <NuxtLink
            :to="hrefFor(item)"
            :aria-current="slot === index ? 'true' : undefined"
            class="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :class="slot === index ? 'bg-surface-2' : undefined"
          >
            <span class="w-4 shrink-0 text-center text-xs text-muted-foreground tabular-nums">
              <Play
                v-if="slot === index"
                class="size-3 fill-current text-primary"
                aria-label="Now playing"
              />
              <template v-else>{{ slot + 1 }}</template>
            </span>

            <div class="relative aspect-video w-24 shrink-0 overflow-hidden rounded bg-muted">
              <img
                :src="item.image"
                :alt="item.title"
                width="192"
                height="108"
                loading="lazy"
                class="size-full object-cover"
              />
            </div>

            <div class="min-w-0 flex-1">
              <h3
                class="line-clamp-2 text-xs font-medium leading-snug"
                :class="slot === index ? 'text-primary' : 'text-foreground'"
              >
                {{ item.title }}
              </h3>
              <p class="mt-0.5 truncate text-[11px] text-muted-foreground">{{ item.channel }}</p>
            </div>
          </NuxtLink>
        </li>
      </ol>
    </div>
  </section>
</template>
