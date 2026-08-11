<script setup lang="ts">
import { Radio, Tv, UserPlus } from '@lucide/vue'
import { Button } from '@/components/ui/button'

/**
 * What `/following` shows when there's nothing to show.
 *
 * Two cases, not one, because they have different fixes: a visitor needs to
 * sign in, and a signed-in viewer with no follows needs somewhere to go find
 * channels. A single "nothing here" panel would send half the people who see it
 * to the wrong place.
 *
 * Both spell out what following actually does — this page is the payoff for the
 * Follow button, so the empty state is the one chance to say what that button
 * is for.
 */
defineProps<{ signedIn: boolean }>()
</script>

<template>
  <section
    class="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card/40 px-6 py-12 text-center"
  >
    <span class="grid size-14 place-items-center rounded-full bg-surface-2 text-muted-foreground">
      <component :is="signedIn ? UserPlus : Tv" class="size-7" aria-hidden="true" />
    </span>

    <div class="space-y-1.5">
      <h2 class="text-lg font-semibold text-foreground">
        {{ signedIn ? "You're not following anyone yet" : 'Sign in to see who you follow' }}
      </h2>
      <p class="text-sm leading-relaxed text-muted-foreground">
        Follow a channel and its newest videos land here, with its circle lit up
        the moment it goes live.
      </p>
    </div>

    <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      <template v-if="signedIn">
        <Button as-child>
          <NuxtLink to="/channels">
            <Tv />
            Browse channels
          </NuxtLink>
        </Button>
        <Button as-child variant="outline">
          <NuxtLink to="/live">
            <Radio />
            See who's live
          </NuxtLink>
        </Button>
      </template>
      <template v-else>
        <Button as-child>
          <NuxtLink to="/login">Log in</NuxtLink>
        </Button>
        <Button as-child variant="outline">
          <NuxtLink to="/channels">
            <Tv />
            Browse channels
          </NuxtLink>
        </Button>
      </template>
    </div>
  </section>
</template>
