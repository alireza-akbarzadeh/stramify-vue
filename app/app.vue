<template>
  <div>
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-rose-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
    >
      Skip to content
    </a>
    <NuxtRouteAnnouncer />
    <!--
      `app.vue` exists, so layouts only apply if `NuxtPage` is wrapped in
      `NuxtLayout` — without this every page renders bare and has to build its
      own chrome (which is how `/live`, `/clips` etc. lost the app sidebar).
      https://nuxt.com/docs/4.x/directory-structure/app/layouts
    -->
    <!--
      `motion-v` ships with `reducedMotion: 'never'` — it animates whatever it
      is told to, regardless of the viewer's system preference. `'user'` hands
      that decision back: transform and layout animations are dropped for
      anyone with `prefers-reduced-motion: reduce`, while opacity still
      crossfades, so content changes stay legible instead of snapping.

      It lives here rather than per-component because the alternative is
      remembering it at every call site, and the one that gets forgotten is the
      bug (PROMPT.md §17). `MotionConfig` renders its slot and nothing else, so
      it adds no element to the tree. CSS-driven motion is unaffected — that
      path uses the `motion-reduce:` variant.
    -->
    <MotionConfig reduced-motion="user">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </MotionConfig>
    <Toaster rich-colors close-button />
  </div>
</template>

<script setup lang="ts">
import { MotionConfig } from 'motion-v'
import { Toaster } from '@/components/ui/sonner'
</script>
