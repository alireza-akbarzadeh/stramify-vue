<script setup lang="ts">
import ChannelAvatar from '@/components/ChannelAvatar.vue'
import SaveButton from '@/components/discovery/SaveButton.vue'
import LiveBadge from '@/components/LiveBadge.vue'
import { cn } from '@/lib/utils'
import HomeVideoCardMenu from './HomeVideoCardMenu.vue'
import { homeReasonLabel } from '#shared/utils/home'
import type { HomeFeedback, HomeVideo } from '#shared/types/home'

/**
 * One card in the home grid.
 *
 * A grid card rather than the list row `WatchUpNextCard` renders, because the
 * home page is a wall of thumbnails and the sidebar is a column of them — same
 * data, different density.
 *
 * The title link is a *stretched* link: `after:inset-0` spreads an invisible
 * overlay across the whole `article`, so clicking anywhere on the card opens
 * the video while the buttons stay real buttons. Wrapping the card in the
 * anchor instead — which is what this did before the menu existed — makes every
 * button inside it invalid HTML and swallows its clicks.
 */
const props = withDefaults(
  defineProps<{
    video: HomeVideo
    saved: boolean
    /** Passed through to the ⋮ menu — see `HomeVideoCardMenu`. */
    allowFeedback?: boolean
    /**
     * Let the thumbnail bleed to the screen edges *below `sm`* — the one-column
     * feed on a phone, where a 16:9 image inset by the page gutter is the
     * clearest tell that you're looking at a web page rather than an app. Off by
     * default because the other place this card renders is a rail slide, which
     * is narrower than the gutter it would be bleeding past.
     *
     * Only the base breakpoint is affected: from `sm` up the card is in a
     * multi-column grid where a full-width thumbnail makes no sense, and the
     * gutter is no longer 1rem anyway.
     */
    flush?: boolean
  }>(),
  { allowFeedback: true, flush: false }
)
defineEmits<{
  (e: 'toggle-save'): void
  (e: 'feedback', value: HomeFeedback): void
}>()

const to = computed(() => `/watch/${encodeURIComponent(props.video.slug)}`)
const reason = computed(() =>
  props.video.reason ? homeReasonLabel(props.video.reason, props.video.channel) : null
)
</script>

<template>
  <article class="group relative">
    <div
      :class="
        cn(
          'relative aspect-video overflow-hidden bg-muted',
          flush ? '-mx-4 rounded-none sm:mx-0 sm:rounded-xl' : 'rounded-xl'
        )
      "
    >
      <img
        :src="video.image"
        :alt="video.title"
        width="960"
        height="540"
        loading="lazy"
        class="size-full object-cover transition duration-500 group-hover:scale-105"
      />
      <LiveBadge v-if="video.kind === 'live'" class="absolute left-2 top-2" />
      <span
        v-else-if="video.duration"
        class="absolute bottom-2 right-2 rounded-sm bg-background/90 px-1.5 py-0.5 text-[11px] font-semibold text-foreground"
        >{{ video.duration }}</span
      >
    </div>

    <div class="mt-3 flex gap-3">
      <ChannelAvatar
        :name="video.channel"
        :image="video.avatarUrl"
        class="size-9"
        aria-hidden="true"
      />
      <div class="min-w-0 flex-1">
        <h3 class="text-sm font-semibold leading-snug">
          <!-- When the thumbnail bleeds past the card's box, the stretched
               overlay has to bleed with it — otherwise the outer 1rem of the
               image on each side isn't part of the link, and a thumb landing
               near the screen edge hits nothing. -->
          <NuxtLink
            :to="to"
            :class="
              cn(
                'line-clamp-2 rounded text-foreground transition-colors after:absolute after:inset-0 after:rounded-xl group-hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                flush && 'after:-left-4 after:-right-4 sm:after:left-0 sm:after:right-0'
              )
            "
          >
            {{ video.title }}
          </NuxtLink>
        </h3>
        <p class="mt-1 truncate text-xs text-muted-foreground">{{ video.channel }}</p>
        <p class="truncate text-xs text-muted-foreground">{{ video.meta }}</p>
        <p v-if="reason" class="mt-1 truncate text-xs font-medium text-primary">{{ reason }}</p>
      </div>

      <!-- Above the stretched link's overlay, or the card would eat the click. -->
      <HomeVideoCardMenu
        :video="video"
        :saved="saved"
        :allow-feedback="allowFeedback"
        class="relative z-10 -mr-1"
        @toggle-save="$emit('toggle-save')"
        @feedback="$emit('feedback', $event)"
      />
    </div>

    <!--
      Pointer-only, and not because it's decoration: Tailwind v4 gates `hover:`
      behind `@media (hover: hover)`, so on a phone this button never became
      visible — while staying perfectly clickable, an invisible 36px target
      parked on the thumbnail's corner swallowing taps meant for the video.
      Touch reaches the same action through the ⋮ menu ("Save to Watch later"),
      which is where a phone expects to find it anyway.
    -->
    <SaveButton
      :saved="saved"
      :kind="video.kind"
      :label="video.title"
      class="absolute right-2 top-2 z-10 hidden opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 sm:inline-flex"
      @toggle="$emit('toggle-save')"
    />
  </article>
</template>
