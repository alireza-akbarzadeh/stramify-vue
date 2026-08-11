<script setup lang="ts">
import { Compass, History, SearchX, Tv } from '@lucide/vue'
import { Button } from '@/components/ui/button'

/**
 * What `/history` shows when the list is empty.
 *
 * Three cases, not one, because each has a different fix: a visitor needs to
 * sign in, a signed-in viewer with nothing watched needs somewhere to go, and
 * someone whose search matched nothing needs their term back so they can change
 * it. A single "nothing here" panel would send two thirds of the people who see
 * it to the wrong place.
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
        :is="noResults ? SearchX : signedIn ? History : Tv"
        aria-hidden="true"
        class="size-7"
      />
    </span>

    <div class="space-y-1.5">
      <h2 class="text-lg font-semibold text-foreground">
        <template v-if="noResults">No videos match “{{ search }}”</template>
        <template v-else-if="signedIn">You haven't watched anything yet</template>
        <template v-else>Sign in to see your watch history</template>
      </h2>
      <p class="text-sm leading-relaxed text-muted-foreground">
        <template v-if="noResults">
          History only searches titles and channel names of videos you've already watched.
        </template>
        <template v-else>
          Videos you watch land here with a progress bar, so you can pick any of them back up
          exactly where you stopped.
        </template>
      </p>
    </div>

    <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      <Button v-if="noResults" type="button" @click="$emit('clear-search')"> Clear search </Button>
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
