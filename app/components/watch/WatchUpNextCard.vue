<script setup lang="ts">
import type { RelatedItem } from '#shared/types/watch'
import LiveBadge from '@/components/LiveBadge.vue'
import SaveButton from '@/components/discovery/SaveButton.vue'

defineProps<{ item: RelatedItem; saved: boolean }>()
const emit = defineEmits<{ (e: 'toggle-save'): void }>()
</script>

<template>
  <article class="group relative flex gap-3">
    <NuxtLink
      :to="`/watch/${encodeURIComponent(item.slug)}`"
      class="flex min-w-0 flex-1 gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <!-- Narrower on a phone: at `w-40` the thumbnail plus the Save button's
           reserved gutter left the title about two words per line. -->
      <div class="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-40">
        <img
          :src="item.image"
          :alt="item.title"
          width="320"
          height="180"
          loading="lazy"
          class="size-full object-cover transition duration-500 group-hover:scale-105"
        />
        <LiveBadge v-if="item.kind === 'live'" class="absolute left-1.5 top-1.5 scale-90" />
        <span
          v-else-if="item.duration"
          class="absolute bottom-1.5 right-1.5 rounded-sm bg-background/90 px-1.5 py-0.5 text-[11px] font-semibold text-foreground"
          >{{ item.duration }}</span
        >
      </div>
      <div class="min-w-0 flex-1 pr-8">
        <h3
          class="line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary"
        >
          {{ item.title }}
        </h3>
        <p class="mt-1 truncate text-xs text-muted-foreground">{{ item.channel }}</p>
        <p class="truncate text-xs text-muted-foreground">{{ item.meta }}</p>
        <!-- Empty in the up-next rail. The AI picks list fills it with the
             model's one-line reason, which is the only thing that separates
             the two lists — worth a slot rather than a second copy of this
             card that drifts from it. -->
        <slot name="note" />
      </div>
    </NuxtLink>
    <!-- Revealed on hover only where there *is* a hover: on a touch screen
         `group-hover` never fires, so gating on it alone left Save visible
         nowhere and reachable only by keyboard — i.e. not at all on a phone. -->
    <SaveButton
      :saved="saved"
      :kind="item.kind"
      :label="item.title"
      class="absolute right-0 top-0 size-8 transition-opacity focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
      @toggle="emit('toggle-save')"
    />
  </article>
</template>
