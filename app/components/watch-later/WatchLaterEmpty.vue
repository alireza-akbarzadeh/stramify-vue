<script setup lang="ts">
import { Clock, Compass, Tv } from '@lucide/vue'
import { Button } from '@/components/ui/button'

/**
 * What `/watch-later` shows when the queue is empty.
 *
 * Two cases rather than one, for the reason `HistoryEmpty` has three: a visitor
 * needs to sign in, and a signed-in viewer with an empty queue needs somewhere
 * to go and to be told how things get here. A single "nothing saved" panel
 * would send half the people who see it to the wrong place.
 *
 * There's no "no results" case because the queue isn't searchable — ten to
 * sixty saved videos is a list you scan, not one you query.
 */
defineProps<{ signedIn: boolean }>()
</script>

<template>
  <section
    class="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card/40 px-6 py-12 text-center"
  >
    <span class="grid size-14 place-items-center rounded-full bg-surface-2 text-muted-foreground">
      <component :is="signedIn ? Clock : Tv" aria-hidden="true" class="size-7" />
    </span>

    <div class="space-y-1.5">
      <h2 class="text-lg font-semibold text-foreground">
        <template v-if="signedIn">Nothing saved yet</template>
        <template v-else>Sign in to save videos for later</template>
      </h2>
      <p class="text-sm leading-relaxed text-muted-foreground">
        Pick <strong class="font-medium text-foreground">Save to Watch later</strong> from any
        video's menu and it lands here — and on your home page — until you get to it.
      </p>
    </div>

    <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      <template v-if="signedIn">
        <Button as-child>
          <NuxtLink to="/">
            <Compass />
            Browse videos
          </NuxtLink>
        </Button>
        <Button as-child variant="outline">
          <NuxtLink to="/live">
            <Tv />
            See who's live
          </NuxtLink>
        </Button>
      </template>
      <template v-else>
        <Button as-child>
          <NuxtLink to="/login">Log in</NuxtLink>
        </Button>
        <Button as-child variant="outline">
          <NuxtLink to="/">
            <Compass />
            Browse videos
          </NuxtLink>
        </Button>
      </template>
    </div>
  </section>
</template>
