<script lang="ts" setup>
import type {LiveSignal} from '#shared/types/discovery'
import {type LiveCategory} from '@/utils/live'
import {useDiscoveryCategories} from "~/composables/useDiscoveryCategories.ts";

definePageMeta({layout: 'dashboard'})
useHead({title: 'Home — Streamify'})
const {data: categories, isPending: categoryLoading} = useDiscoveryCategories()

const activeCategory = ref<LiveCategory>('All Live')

function open(signal: LiveSignal) {
  navigateTo(`/watch/${encodeURIComponent(signal.name)}`)
}
</script>

<template>
  <div class="mx-auto max-w-[1560px] px-4  sm:px-8 mt-6">
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <CategoryScroller
          v-model:active-category="activeCategory"
          :categories="categories ?? []"
      />
    </div>
  </div>
</template>
