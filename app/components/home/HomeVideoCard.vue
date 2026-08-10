<script setup lang="ts">
import ChannelAvatar from '@/components/ChannelAvatar.vue'
import SaveButton from '@/components/discovery/SaveButton.vue'
import LiveBadge from '@/components/landing/LiveBadge.vue'
import { homeReasonLabel } from '#shared/utils/home'
import type { HomeVideo } from '#shared/types/home'

/**
 * One card in the home grid.
 *
 * A grid card rather than the list row `WatchUpNextCard` renders, because the
 * home page is a wall of thumbnails and the sidebar is a column of them — same
 * data, different density. The whole thumbnail and title are one link so the
 * click target is the card, not the words; the save button sits outside that
 * link (a button inside an anchor is invalid and swallows the click).
 */
const props = defineProps<{ video: HomeVideo; saved: boolean }>()
defineEmits<{ (e: 'toggle-save'): void }>()

const to = computed(() => `/watch/${encodeURIComponent(props.video.slug)}`)
const reason = computed(() =>
  props.video.reason ? homeReasonLabel(props.video.reason, props.video.channel) : null
)
</script>

<template>
  <article class="group relative">
    <NuxtLink
      :to="to"
      class="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
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
        <div class="min-w-0 flex-1 pr-8">
          <h3
            class="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary"
          >
            {{ video.title }}
          </h3>
          <p class="mt-1 truncate text-xs text-muted-foreground">{{ video.channel }}</p>
          <p class="truncate text-xs text-muted-foreground">{{ video.meta }}</p>
          <p v-if="reason" class="mt-1 truncate text-xs font-medium text-primary">{{ reason }}</p>
        </div>
      </div>
    </NuxtLink>

    <SaveButton
      :saved="saved"
      :label="video.title"
      class="absolute right-2 top-2 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
      @toggle="$emit('toggle-save')"
    />
  </article>
</template>
