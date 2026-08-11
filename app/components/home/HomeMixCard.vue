<script setup lang="ts">
import CoverStack from '@/components/CoverStack.vue'
import { mixHref } from '#shared/utils/mix'
import type { MixSummary } from '#shared/types/mix'

/**
 * A mix, drawn as a stack of its first few thumbnails.
 *
 * The stack itself is `CoverStack`, shared with playlist cards — a mix and a
 * playlist are the same idea to a viewer ("a list you can open and play"), so
 * they should be the same object on screen.
 */
const props = defineProps<{ mix: MixSummary }>()

const to = computed(() => mixHref(props.mix))
</script>

<template>
  <article class="group">
    <NuxtLink
      :to="to"
      class="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CoverStack :covers="mix.covers" :count="mix.count" :alt="mix.title" />

      <div class="mt-3">
        <h3
          class="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary"
        >
          {{ mix.title }}
        </h3>
        <p class="mt-1 line-clamp-2 text-xs text-muted-foreground">{{ mix.subtitle }}</p>
      </div>
    </NuxtLink>
  </article>
</template>
