<script lang="ts" setup>
import {Button} from '@/components/ui/button'

defineProps<{
  categories: CategorySummary[]
  activeCategory: string
}>()

const emit = defineEmits<{
  'update:activeCategory': [category: string]
}>()
</script>

<template>
  <div class="relative w-full">
    <!-- Horizontal scroll container -->
    <div
        class="flex gap-2 overflow-x-auto py-1
             [scrollbar-width:none]
             [&::-webkit-scrollbar]:hidden"
    >
      <Button
          v-for="category in categories"
          :key="category.slug"
          :variant="activeCategory === category.name ? 'default' : 'secondary'"
          class="shrink-0 rounded-lg px-4 font-semibold transition-all
               hover:scale-[1.02]"
          size="sm"
          type="button"
          @click="emit('update:activeCategory', category.slug)"
      >
        {{ category.name }}
      </Button>
    </div>
  </div>
</template>