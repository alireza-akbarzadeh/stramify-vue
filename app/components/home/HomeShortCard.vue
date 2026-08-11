<script setup lang="ts">
import ChannelAvatar from '@/components/ChannelAvatar.vue'
import type { Short } from '#shared/types/shorts'

/**
 * One short in the home shelf: a 9:16 poster with the title over it.
 *
 * Portrait on purpose. A short in a 16:9 card is two black bars — the exact
 * reason every landscape surface filters `orientation = 'vertical'` out — so
 * the shelf that *does* show them has to be shaped like them, which is also
 * what tells a viewer at a glance that this row behaves differently.
 *
 * Links into `/shorts?v=`, the full-screen feed, rather than `/watch`: the
 * watch page redirects vertical clips there anyway, and going straight avoids
 * a visible bounce.
 */
const props = defineProps<{ short: Short }>()

const to = computed(() => `/shorts?v=${encodeURIComponent(props.short.id)}`)
</script>

<template>
  <article class="group">
    <NuxtLink
      :to="to"
      class="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div class="relative aspect-[9/16] overflow-hidden rounded-xl bg-muted">
        <img
          :src="short.posterUrl"
          :alt="short.title"
          width="405"
          height="720"
          loading="lazy"
          class="size-full object-cover transition duration-500 group-hover:scale-105"
        />

        <!-- Gradient rather than a solid plate: the title has to stay readable
             over an arbitrary frame without hiding the picture it sits on. -->
        <div
          class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pt-8"
        >
          <h3 class="line-clamp-2 text-sm font-semibold leading-snug text-white">
            {{ short.title }}
          </h3>
          <p class="mt-1 flex items-center gap-1.5 text-xs text-white/80">
            <ChannelAvatar
              :name="short.channel"
              :image="short.avatarUrl"
              class="size-4"
              aria-hidden="true"
            />
            <span class="truncate">{{ short.views }}</span>
          </p>
        </div>
      </div>
    </NuxtLink>
  </article>
</template>
