<script setup lang="ts">
import { Play } from '@lucide/vue'
import { useHoverPreview } from '@/composables/useHoverPreview'
import NowPlayingBars from './NowPlayingBars.vue'
import type { MusicTrack } from '#shared/types/music'

/**
 * One track. Hovering it plays a muted few seconds of the real thing.
 *
 * The whole card is a single `NuxtLink`, not a link with a nested play button:
 * `/watch` is the only destination this card has, and a button inside a link
 * is both a nesting violation and a coin-flip about which one a click hits.
 * The play circle is `pointer-events-none` decoration over the link's own hit
 * area, so the entire card — art and text — is one target.
 *
 * Everything the preview adds is layered *over* a card that already works:
 * still, title, creator, views and duration are readable before any of it
 * fires. See `useHoverPreview` for the cases where it never does (touch,
 * reduced motion, HLS outside Safari) and why each is a non-event here.
 */
const props = defineProps<{ track: MusicTrack }>()

// Destructured so the template unwraps these as top-level refs — reaching
// through `preview.showVideo.value` in markup reads far worse.
const { mounted, showVideo, progress, enter, leave, onLoadedMetadata, onTimeUpdate, onError } =
  useHoverPreview(() => props.track.videoUrl)

const to = computed(() => `/watch/${encodeURIComponent(props.track.id)}`)
</script>

<template>
  <article class="group/card relative">
    <NuxtLink
      :to="to"
      class="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      @pointerenter="enter()"
      @pointerleave="leave()"
    >
      <!--
        The art. Hover moves `transform` and `box-shadow` only — never a width
        or a margin — so a rail of twelve of these never relayouts while the
        cursor crosses it (design-system anti-pattern: layout-shifting hovers).
      -->
      <div
        class="relative aspect-video overflow-hidden rounded-xl bg-muted ring-1 ring-border/60 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/card:-translate-y-1 group-hover/card:shadow-xl group-hover/card:shadow-black/30 group-hover/card:ring-primary/50 motion-reduce:transition-none motion-reduce:group-hover/card:translate-y-0"
      >
        <img
          :src="track.image"
          :alt="track.title"
          width="960"
          height="540"
          loading="lazy"
          decoding="async"
          class="size-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/card:scale-105 motion-reduce:transition-none motion-reduce:group-hover/card:scale-100"
        />

        <!--
          Mounted only while wanted, so an idle rail holds no video elements at
          all. `showVideo` is deliberately separate from `mounted`: the element
          exists and buffers for a moment before it's faded up, which is what
          makes the crossfade land on a playing frame rather than a black one.
          No player chrome — this is an affordance, not a viewing surface, and
          it's `aria-hidden` because it duplicates the still it sits on.
        -->
        <video
          v-if="mounted"
          ref="previewVideo"
          :src="track.videoUrl"
          muted
          playsinline
          disablepictureinpicture
          preload="auto"
          aria-hidden="true"
          tabindex="-1"
          class="absolute inset-0 size-full object-cover transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          :class="showVideo ? 'opacity-100' : 'opacity-0'"
          @loadedmetadata="onLoadedMetadata()"
          @timeupdate="onTimeUpdate()"
          @error="onError()"
        />

        <!-- Always painted, so the corner chip is legible on a pale thumbnail
             as well as a dark one rather than only on the ones we seeded. -->
        <div
          class="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent"
        />

        <!-- Fades and scales in together — one gesture, not two. Hidden once
             the preview takes over: by then the card is already showing motion
             and a play glyph on top of it would just be noise. -->
        <div
          class="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300"
          :class="showVideo ? 'opacity-0' : 'opacity-0 group-hover/card:opacity-100'"
        >
          <span
            class="flex size-12 scale-90 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/40 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/card:scale-100 motion-reduce:transition-none"
          >
            <Play class="size-5 translate-x-px fill-current" />
          </span>
        </div>

        <!-- While previewing, the corner says what's happening instead of how
             long the track is; the duration is back the moment it stops. -->
        <span
          v-if="showVideo"
          class="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1.5 rounded-md bg-primary/90 px-2 py-1 text-[11px] font-semibold text-primary-foreground backdrop-blur-sm"
        >
          <NowPlayingBars />
          Preview
        </span>
        <span
          v-else
          class="pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm"
        >
          {{ track.duration }}
        </span>

        <!--
          The preview window, drawn across the foot of the art. `scaleX` from a
          left origin rather than an animated `width`, so the four-times-a-second
          update stays off the layout path.
        -->
        <div
          v-if="showVideo"
          class="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-white/25"
        >
          <div class="h-full origin-left bg-primary" :style="{ transform: `scaleX(${progress})` }" />
        </div>
      </div>

      <div class="mt-3">
        <h3
          class="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors duration-200 group-hover/card:text-primary"
        >
          {{ track.title }}
        </h3>
        <p class="mt-1 truncate text-xs text-muted-foreground">{{ track.creator }}</p>
        <p class="mt-0.5 truncate text-xs text-muted-foreground/80">
          {{ track.views }} · {{ track.age }}
        </p>
      </div>
    </NuxtLink>
  </article>
</template>
