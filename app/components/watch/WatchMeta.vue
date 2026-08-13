<script setup lang="ts">
import { Eye, Radio } from '@lucide/vue'
import type { WatchTarget } from '#shared/types/watch'
import { toCategorySlug } from '#shared/utils/category'

const props = defineProps<{ target: WatchTarget }>()

const categoryHref = computed(() => `/category/${toCategorySlug(props.target.category)}`)
</script>

<template>
  <div class="space-y-2 sm:space-y-3">
    <h1 class="text-lg font-semibold leading-snug text-foreground sm:text-xl lg:text-2xl">
      {{ target.title }}
    </h1>
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
      <NuxtLink
        :to="categoryHref"
        class="rounded-md bg-surface-2 px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {{ target.category }}
      </NuxtLink>

      <template v-if="target.kind === 'live'">
        <span class="flex items-center gap-1.5 font-medium text-primary">
          <Radio class="size-4" aria-hidden="true" />
          {{ target.viewers }}
        </span>
        <span aria-hidden="true">·</span>
        <span>live for {{ target.uptime }}</span>
      </template>

      <template v-else>
        <span class="flex items-center gap-1.5">
          <Eye class="size-4" aria-hidden="true" />
          {{ target.views }}
        </span>
        <span aria-hidden="true">·</span>
        <span>{{ target.publishedAt }}</span>
        <span aria-hidden="true">·</span>
        <span>{{ target.duration }}</span>
      </template>
    </div>
  </div>
</template>
