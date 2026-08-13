<script setup lang="ts">
import { Play } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { useAmbientVideo } from '@/composables/useAmbientVideo'
import NowPlayingBars from './NowPlayingBars.vue'
import type { MusicTrack } from '#shared/types/music'

/**
 * The featured track, played ambiently behind its own title.
 *
 * The layout is a single stacking context: artwork and video fill the whole
 * box, a gradient scrim sits over them, and the copy sits over that. On a
 * phone the scrim is vertical (text over the bottom of the image) and from
 * `md` up it turns horizontal (text over the left third, video breathing on
 * the right) — one element, one gradient swap, no duplicated markup for two
 * layouts.
 *
 * Every scrim here is opaque enough on its own that the copy meets contrast
 * against the *scrim*, not against whatever thumbnail happens to be behind it
 * — artwork is user content and can be any brightness.
 */
const props = defineProps<{ track: MusicTrack; queue: MusicTrack[] }>()

const { playing, allowed, onLoadedMetadata, onError } = useAmbientVideo(() => props.track.videoUrl)

const to = computed(() => `/watch/${encodeURIComponent(props.track.id)}`)
</script>

<template>
  <section
    ref="ambientRoot"
    aria-labelledby="music-hero-title"
    class="relative isolate overflow-hidden rounded-2xl bg-muted"
  >
    <!-- Fixed aspect at every breakpoint so the hero reserves its own height
         before the artwork loads — no CLS when a 960×540 image lands. -->
    <div class="relative aspect-[4/5] w-full sm:aspect-[16/10] lg:aspect-[21/9]">
      <img
        :src="track.image"
        alt=""
        width="960"
        height="540"
        fetchpriority="high"
        class="absolute inset-0 size-full object-cover"
      />

      <!--
        The ambient loop, faded over the still once it's genuinely playing.
        `loop` and no controls: it's atmosphere, and the real player is one
        click away. `aria-hidden` because it carries no information the title
        block below doesn't already state.

        `v-if="allowed"` keeps it out of the DOM entirely when it could never
        play — reduced motion, or a source this browser can't decode. Rendering
        it anyway would still cost the metadata request for a element that is
        permanently at `opacity: 0`.
      -->
      <video
        v-if="allowed"
        ref="ambientVideo"
        :src="track.videoUrl"
        muted
        loop
        playsinline
        disablepictureinpicture
        preload="metadata"
        aria-hidden="true"
        tabindex="-1"
        class="absolute inset-0 size-full object-cover transition-opacity duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        :class="playing ? 'opacity-100' : 'opacity-0'"
        @loadedmetadata="onLoadedMetadata()"
        @error="onError()"
      />

      <!-- Bottom-up on a phone, left-to-right from `md`. -->
      <div
        class="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent md:bg-gradient-to-r md:from-background md:via-background/85 md:to-transparent"
      />
      <!-- A second, shallower pass so the copy never sits on a bright frame
           mid-loop; the video changes what's underneath it every few seconds. -->
      <div class="absolute inset-0 bg-background/25 md:bg-transparent" />

      <div class="absolute inset-0 flex items-end p-5 sm:p-8 md:items-center lg:p-12">
        <div class="w-full max-w-xl">
          <p
            class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"
          >
            <NowPlayingBars v-if="playing" />
            Featured on Music
          </p>

          <h1
            id="music-hero-title"
            class="mt-3 text-pretty text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-4xl lg:text-5xl"
          >
            {{ track.title }}
          </h1>

          <p class="mt-3 text-sm text-muted-foreground">
            {{ track.creator }} · {{ track.views }} · {{ track.age }}
          </p>

          <div class="mt-6 flex flex-wrap items-center gap-3">
            <Button as-child size="lg" class="rounded-full">
              <NuxtLink :to="to">
                <Play class="size-4 fill-current" aria-hidden="true" />
                Play now
              </NuxtLink>
            </Button>
            <span class="text-xs font-medium tabular-nums text-muted-foreground">
              {{ track.duration }}
            </span>
          </div>

          <!--
            Up next. A real list, because that's what it is — and it doubles as
            the "there's more here" signal before the viewer has scrolled to the
            first shelf. Hidden below `sm`, where the hero already fills the
            screen and five more tap targets would crowd the one that matters.
          -->
          <div v-if="queue.length" class="mt-8 hidden sm:block">
            <h2
              class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
            >
              Up next
            </h2>
            <ul class="mt-3 flex gap-3">
              <li v-for="item in queue" :key="item.id" class="min-w-0">
                <NuxtLink
                  :to="`/watch/${encodeURIComponent(item.id)}`"
                  class="group/thumb block w-20 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-24"
                >
                  <span
                    class="block overflow-hidden rounded-lg ring-1 ring-border/60 transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/thumb:-translate-y-0.5 group-hover/thumb:ring-primary/60 motion-reduce:transition-none"
                  >
                    <img
                      :src="item.image"
                      :alt="item.title"
                      width="192"
                      height="108"
                      loading="lazy"
                      class="aspect-video w-full object-cover"
                    />
                  </span>
                  <span
                    class="mt-1.5 line-clamp-2 text-[11px] leading-tight text-muted-foreground transition-colors group-hover/thumb:text-foreground"
                  >
                    {{ item.title }}
                  </span>
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
