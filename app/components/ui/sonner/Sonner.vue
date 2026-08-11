<script lang="ts" setup>
import {Toaster as Sonner, type ToasterProps} from 'vue-sonner'

// Nuxt's color mode (@nuxtjs/color-mode), auto-imported — not VueUse's. They
// are separate instances with separate storage keys, so importing the wrong
// one leaves the toaster on a theme the rest of the app isn't using.
const colorMode = useColorMode()

const props = withDefaults(defineProps<ToasterProps>(), {
  position: 'bottom-right'
})
</script>

<template>
  <Sonner
      :theme="colorMode.value === 'dark' ? 'dark' : 'light'"
      :toast-options="{
      classes: {
        toast:
          'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
        description: 'group-[.toast]:text-muted-foreground',
        actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
        cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        error:
          'group-[.toaster]:!bg-destructive group-[.toaster]:!text-destructive-foreground group-[.toaster]:!border-destructive'
      }
    }"
      class="toaster group"
      v-bind="props"
  />
</template>
