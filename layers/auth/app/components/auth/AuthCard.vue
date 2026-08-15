<script setup lang="ts">
defineProps<{ title: string; subtitle: string }>()
</script>

<template>
  <div class="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-16">
    <div class="pointer-events-none absolute inset-0" aria-hidden="true">
      <div class="absolute left-1/2 top-0 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/20 blur-[120px]" />
      <div class="absolute bottom-0 right-0 h-[360px] w-[360px] translate-x-1/3 translate-y-1/3 rounded-full bg-secondary/40 blur-[100px]" />
    </div>

    <div class="relative w-full max-w-sm">
      <NuxtLink
        to="/"
        class="mb-8 flex items-center justify-center gap-2 text-lg font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
      >
        <span class="inline-block h-6 w-6 rounded-md bg-primary shadow-[0_0_16px_-2px_rgba(225,29,72,0.8)]" aria-hidden="true" />
        Streamify
      </NuxtLink>

      <Reveal>
        <div class="rounded-2xl border border-white/10 bg-white/3 p-8 shadow-2xl backdrop-blur-xl">
          <h1 class="text-2xl font-semibold tracking-tight text-foreground">{{ title }}</h1>
          <p class="mt-1.5 text-sm text-muted-foreground">{{ subtitle }}</p>
          <div class="mt-7">
            <slot />
          </div>
        </div>
      </Reveal>

      <p class="mt-6 text-center text-sm text-muted-foreground">
        <slot name="footer" />
      </p>
    </div>
  </div>
</template>
