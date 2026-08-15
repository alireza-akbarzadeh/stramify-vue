<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import { Button } from '@/components/ui/button'
</script>

<template>
  <section class="relative overflow-hidden py-24 sm:py-32">
    <div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      <div class="absolute left-1/2 top-1/2 size-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/18 blur-[140px]" />
      <div class="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black,transparent)]" />
    </div>

    <Reveal>
      <div class="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 class="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Your channel is one click away.
        </h2>
        <p class="mx-auto mt-5 max-w-xl text-pretty text-lg text-muted-foreground">
          Create a channel, paste the ingest URL into your encoder, and go live. Free to start,
          no credit card, no infrastructure to run.
        </p>
        <div class="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Magnetic>
            <Button as-child size="lg">
              <NuxtLink to="/signup">Create your channel <ArrowRight class="size-4" /></NuxtLink>
            </Button>
          </Magnetic>
          <Magnetic>
            <Button as-child size="lg" variant="outline">
              <NuxtLink to="/live">Browse live channels</NuxtLink>
            </Button>
          </Magnetic>
        </div>
      </div>
    </Reveal>
  </section>
</template>
