<script setup lang="ts">
import ChannelAvatar from '@/components/ChannelAvatar.vue'
import SaveButton from '@/components/discovery/SaveButton.vue'
import LiveBadge from '@/components/landing/LiveBadge.vue'
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
  }>(),
  { allowFeedback: true }
)
defineEmits<{
  (e: 'toggle-save' | 'save-later'): void
  (e: 'feedback', value: HomeFeedback): void
}>()

const to = computed(() => `/watch/${encodeURIComponent(props.video.slug)}`)
const reason = computed(() =>
  props.video.reason ? homeReasonLabel(props.video.reason, props.video.channel) : null
)
</script>

<template>
  <article class="group relative">
    <div class="relative aspect-video overflow-hidden rounded-xl bg-muted">
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
          <NuxtLink
            :to="to"
            class="line-clamp-2 rounded text-foreground transition-colors after:absolute after:inset-0 after:rounded-xl group-hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        @save-later="$emit('save-later')"
        @feedback="$emit('feedback', $event)"
      />
    </div>

    <SaveButton
      :saved="saved"
      :label="video.title"
      class="absolute right-2 top-2 z-10 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
      @toggle="$emit('toggle-save')"
    />
  </article>
</template>
