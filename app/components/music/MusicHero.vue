<script setup lang="ts">
import { Music4, Play } from '@lucide/vue'
import { AnimatePresence, motion } from 'motion-v'
import { Button } from '@/components/ui/button'
import { useAmbientVideo } from '@/composables/useAmbientVideo'
import { useSlideshow } from '@/composables/useSlideshow'
import MusicHeroControls from './MusicHeroControls.vue'
import MusicHeroQueue from './MusicHeroQueue.vue'
import NowPlayingBars from './NowPlayingBars.vue'
import type { MusicTrack } from '#shared/types/music'

/**
 * The featured track — a carousel that plays each slide ambiently behind its
 * own title, and moves on by itself.
 *
 * The layout is a single stacking context: artwork and video fill the whole
 * box, gradients sit over them, and the copy sits over that. On a phone the
 * scrim is vertical (text over the bottom of the image); from `md` a second
 * horizontal pass darkens the left third, so the copy gets its own field and
 * the artwork keeps breathing on the right.
 *
 * **The scrim is black in both themes, and the copy in here is white.** That
 * reads like a token violation and isn't: artwork is user content and can be
 * any brightness, so this text is measured against the *gradient* — the one
 * thing in the box that never changes. Tinting the scrim with `background` was
 * the earlier approach, and in the light theme it washed the whole hero out to
 * a pale blur with grey text on it.
 *
 * Rotation state lives in `useSlideshow`; what's here is which slide the media
 * and copy show, and the motion between them. The queue strip picks slides
 * rather than linking straight to `/watch`: the old strip skipped the hero
 * entirely, where now a thumbnail brings that track *up here* — ambient loop,
 * title, metadata — and `Play now` follows whatever is showing.
 */
const props = defineProps<{ track: MusicTrack; queue: MusicTrack[] }>()

/** Slide one is the hero; `queue` is everything behind it. */
const slides = computed(() => [props.track, ...props.queue])

/** How long a slide holds. Long enough to read a title and take in the art. */
const DWELL = 7000

const { index, cycle, running, paused, next, prev, goTo, hold, release, toggle } = useSlideshow(
  () => slides.value.length,
  DWELL
)

const active = computed(() => slides.value[index.value] ?? props.track)
const to = computed(() => `/watch/${encodeURIComponent(active.value.id)}`)

const { playing, allowed, onLoadedMetadata, onError } = useAmbientVideo(() => active.value.videoUrl)

/**
 * Nothing animates in on the first paint.
 *
 * This section is the page's LCP element and is server-rendered, so shipping
 * it with an `initial` would send the title out at `opacity: 0` and leave it
 * there for anyone whose JS hasn't arrived or has failed. From the first
 * switch on, every transition is a *response to a change*, which is the only
 * point at which the motion says anything anyway.
 */
const switched = ref(false)
watch(index, () => (switched.value = true))

type Keyframes = Record<string, number | string>
const enter = (from: Keyframes) => (switched.value ? from : false)

/** The app's expo-out curve (see the `motion` skill) — fast out, long settle. */
const EASE = [0.16, 1, 0.3, 1]
const CROSSFADE = { duration: 0.7, ease: EASE }
/** Exits run at half the entrance, so a switch feels answered, not laboured. */
const OUT = { duration: 0.2, ease: EASE }
/**
 * The copy's four lines, staggered ~45ms apart. The whole sequence lands
 * inside 600ms, including the outgoing block: past that a switch stops
 * reading as a response to the press and starts reading as a wait.
 */
const line = (delay: number) => ({ duration: 0.4, delay, ease: EASE })

const pad = (n: number) => String(n).padStart(2, '0')
</script>

<template>
  <section
    ref="ambientRoot"
    aria-labelledby="music-hero-title"
    aria-roledescription="carousel"
    class="relative isolate overflow-hidden rounded-2xl bg-muted shadow-2xl shadow-black/40 ring-1 ring-white/10 sm:rounded-3xl"
    @pointerenter="hold()"
    @pointerleave="release()"
    @focusin="hold()"
    @focusout="release()"
    @keydown.left="prev()"
    @keydown.right="next()"
  >
    <!-- Fixed aspect at every breakpoint so the hero reserves its own height
         before the artwork loads — no CLS when a 960×540 image lands.

         Past `3xl` the ratio has to stop driving the height: 21/9 across a
         2300px container is a 990px hero, which pushes the first shelf off a
         1440px screen entirely. The `max-h` clamps it — width still fills, so
         the box just resolves to a wider ratio (~3:1) rather than a shorter
         one, and the aspect still reserves the space before the image lands.

         The `min-h` is the other end of the same problem. A ratio ties height
         to width, and this hero now carries a fixed stack — copy, controls,
         thumbnails — that doesn't shrink with the viewport: at 1024px, 21/9
         resolves to a ~300px box that the content overflows. The floor is a
         known number, so it costs no layout stability. -->
    <div
      class="relative aspect-[4/5] min-h-[26rem] w-full sm:aspect-[16/10] sm:min-h-[32rem] lg:aspect-[21/9] 3xl:max-h-[720px] 4xl:max-h-[780px]"
    >
      <!--
        `:initial="false"` on the presence wrapper *and* per child (see
        `enter`): the first slide has to render as finished markup, and only
        the slides that replace it get an entrance. The two overlap during a
        crossfade, which is why each one is absolutely positioned rather than
        laid out in flow.
      -->
      <AnimatePresence :initial="false">
        <motion.div
          :key="active.id"
          class="absolute inset-0"
          :initial="enter({ opacity: 0 })"
          :animate="{ opacity: 1 }"
          :exit="{ opacity: 0 }"
          :transition="CROSSFADE"
        >
          <!-- Only the first slide competes for the LCP; the rest are already
               in cache from the strip below by the time they're shown. -->
          <img
            :src="active.image"
            alt=""
            width="960"
            height="540"
            :fetchpriority="index === 0 ? 'high' : 'auto'"
            class="size-full object-cover animate-[ken-burns_var(--ken)_linear_forwards] motion-reduce:animate-none"
            :class="running ? '' : '[animation-play-state:paused]'"
            :style="{ '--ken': `${DWELL * 2.4}ms` }"
          />
        </motion.div>
      </AnimatePresence>

      <!--
        The ambient loop, faded over the still once it's genuinely playing.
        `loop` and no controls: it's atmosphere, and the real player is one
        click away. `aria-hidden` because it carries no information the title
        block below doesn't already state.

        One element for the whole carousel rather than one per slide: setting
        `src` restarts the media load by itself, and mounting a second `<video>`
        mid-crossfade would put two decoders on screen to show one of them.

        `v-if="allowed"` keeps it out of the DOM entirely when it could never
        play — reduced motion, or a source this browser can't decode. Rendering
        it anyway would still cost the metadata request for an element that is
        permanently at `opacity: 0`.
      -->
      <video
        v-if="allowed"
        ref="ambientVideo"
        :src="active.videoUrl"
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

      <!-- Bottom-up everywhere, plus a left-to-right pass from `md`, where the
           copy leaves the bottom edge for the left third. -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/10" />
      <div
        class="absolute inset-0 hidden bg-gradient-to-r from-black/90 via-black/45 to-transparent md:block"
      />

      <div class="absolute inset-0 flex flex-col p-5 sm:p-7 lg:p-10 xl:p-12 3xl:p-16">
        <!-- Where you are in the queue, for anyone who never looks at a strip
             of thumbnails. `aria-hidden`: every slide button below already
             announces its own position and title. -->
        <div class="flex justify-end" aria-hidden="true">
          <span
            class="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold tabular-nums text-white ring-1 ring-white/15 backdrop-blur-md"
          >
            {{ pad(index + 1) }}<span class="px-0.5 text-white/40">/</span>{{ pad(slides.length) }}
          </span>
        </div>

        <!--
          The copy takes the free space and the strip below it is `shrink-0`,
          so a two-line title on one slide and a one-line title on the next
          never move the thumbnails. `mode="wait"` for the same reason: the
          outgoing block leaves before the incoming one arrives, instead of the
          two stacking and doubling this column's height for a frame.

          The measure grows one step on a very wide hero and then stops — the
          title wants the extra room, the metadata line under it doesn't.
        -->
        <div class="flex min-h-0 flex-1 items-end md:items-center">
          <AnimatePresence :initial="false" mode="wait">
            <motion.div
              :key="active.id"
              class="w-full max-w-xl 3xl:max-w-2xl"
              :exit="{ opacity: 0, y: -12 }"
              :transition="OUT"
            >
              <motion.p
                :initial="enter({ opacity: 0, y: 12 })"
                :animate="{ opacity: 1, y: 0 }"
                :transition="line(0)"
                class="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white ring-1 ring-white/20 backdrop-blur-md"
              >
                <NowPlayingBars v-if="playing" />
                <Music4 v-else class="size-3.5" aria-hidden="true" />
                Featured on Music
              </motion.p>

              <motion.h1
                id="music-hero-title"
                :initial="enter({ opacity: 0, y: 16 })"
                :animate="{ opacity: 1, y: 0 }"
                :transition="line(0.045)"
                class="mt-4 line-clamp-2 text-3xl font-bold leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.55)] sm:text-4xl lg:text-5xl 4xl:text-6xl"
              >
                {{ active.title }}
              </motion.h1>

              <motion.div
                :initial="enter({ opacity: 0, y: 14 })"
                :animate="{ opacity: 1, y: 0 }"
                :transition="line(0.09)"
                class="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-sm text-white/70"
              >
                <span class="font-medium text-white">{{ active.creator }}</span>
                <span class="size-1 rounded-full bg-white/35" aria-hidden="true" />
                <span>{{ active.views }}</span>
                <span class="size-1 rounded-full bg-white/35" aria-hidden="true" />
                <span>{{ active.age }}</span>
                <span
                  class="rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-white ring-1 ring-white/15"
                >
                  {{ active.duration }}
                </span>
              </motion.div>

              <motion.div
                :initial="enter({ opacity: 0, y: 14 })"
                :animate="{ opacity: 1, y: 0 }"
                :transition="line(0.135)"
                class="mt-6"
              >
                <Button as-child size="lg" class="rounded-full px-7 text-base">
                  <NuxtLink :to="to">
                    <Play class="size-5 fill-current" aria-hidden="true" />
                    Play now
                  </NuxtLink>
                </Button>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        <!--
          The queue, doubling as the carousel's controls — and still the
          "there's more here" signal before the viewer has scrolled to the
          first shelf.
        -->
        <div v-if="slides.length > 1" class="mt-5 shrink-0">
          <div class="mb-3 flex items-center justify-between gap-4">
            <h2 class="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
              Up next
            </h2>
            <MusicHeroControls :paused="paused" @prev="prev()" @next="next()" @toggle="toggle()" />
          </div>

          <MusicHeroQueue
            :items="slides"
            :index="index"
            :cycle="cycle"
            :running="running"
            :dwell="DWELL"
            @select="goTo"
          />
        </div>
      </div>
    </div>
  </section>
</template>
