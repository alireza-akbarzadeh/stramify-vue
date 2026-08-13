<script setup lang="ts">
import { Music4 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import Reveal from '@/components/motion/Reveal.vue'
import { useMusic } from '@/composables/useMusic'
import MusicHero from './MusicHero.vue'
import MusicShelf from './MusicShelf.vue'
import MusicSkeleton from './MusicSkeleton.vue'

/**
 * `/music` — the hero, then the shelves.
 *
 * Owns the four states the page can be in (loading, error, empty, loaded) and
 * nothing else; the hero and each shelf are presentational and take what they
 * draw. That split is why the empty branch can be honest: it fires when the
 * `Music` category genuinely has no landscape clips, not when a request is
 * still in flight, and it says so rather than showing empty rails.
 */
const { data, isPending, isError, refetch, isFetching } = useMusic()

const hero = computed(() => data.value?.hero ?? null)
const shelves = computed(() => data.value?.shelves ?? [])
</script>

<template>
  <!--
    The cap keeps climbing past `2xl` instead of stopping at 1560px, because a
    rail page is one of the few layouts that genuinely gets better with width —
    extra room becomes more cards, not longer lines of text. It still stops:
    2400px on a 3440px ultrawide is the point where another card stops helping
    and the hero starts looking like a billboard.
  -->
  <div
    class="mx-auto min-w-0 max-w-[1560px] px-4 py-8 sm:px-8 3xl:max-w-[1800px] 3xl:px-10 4xl:max-w-[2400px] 4xl:px-12"
  >
    <MusicSkeleton v-if="isPending" />

    <div
      v-else-if="isError"
      class="rounded-2xl border border-dashed border-destructive/40 py-20 text-center"
    >
      <h1 class="text-lg font-semibold text-foreground">Couldn't load Music</h1>
      <p class="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Something went wrong on our side. Nothing's lost — try again.
      </p>
      <Button
        :disabled="isFetching"
        class="mt-5"
        size="sm"
        type="button"
        variant="outline"
        @click="refetch()"
      >
        {{ isFetching ? 'Retrying…' : 'Retry' }}
      </Button>
    </div>

    <!-- `hero` is null only when the category is empty, so this one check
         covers both "no hero" and "no shelves" — they can't disagree. -->
    <div
      v-else-if="!hero"
      class="rounded-2xl border border-dashed border-border py-20 text-center"
    >
      <Music4 class="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
      <h1 class="mt-4 text-lg font-semibold text-foreground">No music yet</h1>
      <p class="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Nothing has been published to Music so far. Check back — or look through
        everything else that's live right now.
      </p>
      <Button as-child class="mt-5" size="sm" variant="outline">
        <NuxtLink to="/clips">Browse all clips</NuxtLink>
      </Button>
    </div>

    <template v-else>
      <MusicHero :queue="data?.queue ?? []" :track="hero" />

      <div class="mt-12 space-y-12">
        <!-- The hero is above the fold and reveals nothing; the shelves below
             it fade up as they're reached. Delay is 0 — each shelf's own cards
             carry the stagger, and compounding the two would leave the last
             card of the third rail waiting on half a second of choreography. -->
        <Reveal v-for="shelf in shelves" :key="shelf.id" :distance="20">
          <MusicShelf :shelf="shelf" />
        </Reveal>
      </div>
    </template>
  </div>
</template>
