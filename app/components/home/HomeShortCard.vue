<script setup lang="ts">
import ChannelAvatar from '@/components/ChannelAvatar.vue'
import type { Short } from '#shared/types/shorts'

/**
 * One vertical clip in the home Shorts shelf.
 *
 * Deliberately the same object as `HomeRailCard` — rounded-xl thumbnail on
 * `bg-muted`, the same hover scale, the same title/channel/meta triple — with
 * one difference that is the whole point of the shelf: it's 9:16, not 16:9.
 * The shelf exists to say "different format", so the format is the only thing
 * allowed to differ (CLAUDE.md rule 10 in spirit: don't re-invent the card,
 * change the one dimension that matters).
 *
 * The text sits *inside* the poster rather than under it, which is the one
 * place this parts company with the landscape cards. A portrait card is
 * already twice as tall as its neighbours; a text block below would push the
 * shelf past 350px and make Shorts the loudest row on a page where it ranks
 * sixth. Overlaid, the card is 284px against the video rails' ~238px — taller,
 * as a portrait row should be, but still part of the same page.
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
      <div class="relative aspect-9/16 overflow-hidden rounded-xl bg-muted">
        <img
          :alt="short.title"
          :src="short.posterUrl"
          class="size-full object-cover transition duration-500 motion-safe:group-hover:scale-105"
          height="720"
          loading="lazy"
          width="405"
        />

        <!--
          Tall enough to cover all three lines of text at their longest. The
          text is white on a photograph, so the gradient is the contrast
          guarantee, not decoration — it can't be sized to the average case.
        -->
        <div
          class="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/90 via-black/55 to-transparent"
        />

        <div class="absolute inset-x-0 bottom-0 p-3">
          <h3 class="line-clamp-2 text-sm font-semibold leading-snug text-white">
            {{ short.title }}
          </h3>
          <div class="mt-2 flex min-w-0 items-center gap-1.5">
            <ChannelAvatar
              :image="short.avatarUrl"
              :name="short.channel"
              aria-hidden="true"
              class="size-5"
            />
            <span class="truncate text-xs text-white/75">{{ short.channel }}</span>
          </div>
          <!-- Already reads "34.1k views" — see `Short.views`. -->
          <p class="mt-0.5 truncate text-xs text-white/60">{{ short.views }}</p>
        </div>
      </div>
    </NuxtLink>
  </article>
</template>
