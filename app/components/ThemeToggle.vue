<script lang="ts" setup>
import {Moon, Sun} from '@lucide/vue'
import type {HTMLAttributes} from 'vue'
import {cn} from '@/lib/utils'

/** `class` is a real prop so callers can resize/restyle it without the
 *  fallthrough class racing the base one in the stylesheet — the app bar
 *  wants a smaller, borderless variant of the same control. */
const props = defineProps<{ class?: HTMLAttributes['class'] }>()

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

function toggle() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}
</script>

<template>
  <button
      :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
      :class="
      cn(
        'grid size-10 cursor-pointer place-items-center rounded-full border border-border bg-glass text-muted-foreground backdrop-blur transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        props.class
      )
    "
      type="button"
      @click="toggle"
  >
    <ClientOnly>
      <component :is="isDark ? Sun : Moon" aria-hidden="true" class="size-4.5"/>
      <template #fallback><span class="size-4.5"/></template>
    </ClientOnly>
  </button>
</template>
