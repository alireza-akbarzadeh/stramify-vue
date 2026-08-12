<script setup lang="ts">
import { Compass, Heart, SearchX, Tv } from '@lucide/vue'
import { Button } from '@/components/ui/button'

/**
 * What `/liked` shows when there's nothing to draw.
 *
 * Three cases, not one, like `HistoryEmpty`, because each has a different fix:
 * a visitor needs to sign in, a signed-in viewer who hasn't liked anything
 * needs to be told how videos get here, and someone whose search matched
 * nothing needs their term back so they can change it. A single "nothing here"
 * panel would send two thirds of the people who see it to the wrong place.
 */
const props = defineProps<{ signedIn: boolean; search: string }>()
defineEmits<{ (e: 'clear-search'): void }>()

const noResults = computed(() => props.signedIn && props.search.length > 0)
</script>

<template>
  <section
    class="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card/40 px-6 py-12 text-center"
  >
    <span class="grid size-14 place-items-center rounded-full bg-surface-2 text-muted-foreground">
      <component
        :is="noResults ? SearchX : signedIn ? Heart : Tv"
        aria-hidden="true"
        class="size-7"
      />
    </span>

    <div class="space-y-1.5">
      <h2 class="text-lg font-semibold text-foreground">
        <template v-if="noResults">No liked videos match “{{ search }}”</template>
        <template v-else-if="signedIn">You haven't liked anything yet</template>
        <template v-else>Sign in to see your liked videos</template>
      </h2>
      <p class="text-sm leading-relaxed text-muted-foreground">
        <template v-if="noResults">
          This only searches titles and channel names of videos you've already liked.
        </template>
        <template v-else>
          Tap <strong class="font-medium text-foreground">Like</strong> under any video and it lands
          here, so the ones you want again are never more than a search away.
        </template>
      </p>
    </div>

    <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      <Button v-if="noResults" type="button" @click="$emit('clear-search')">Clear search</Button>
      <template v-else-if="signedIn">
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
