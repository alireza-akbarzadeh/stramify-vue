<script setup lang="ts">
/**
 * The loading shape of `/music`.
 *
 * Laid out on the same aspect ratios and widths as the real hero and rails, so
 * the page doesn't jump when the query resolves — the point of a skeleton is
 * to reserve the space, not just to show something moving. Card widths mirror
 * `MusicShelf`'s breakpoints exactly; if those change, these have to follow.
 */
const SHELVES = 2
/** Enough to fill the widest rail (`4xl` shows seven); the row clips the rest. */
const CARDS = 7
</script>

<template>
  <div aria-label="Loading music" class="space-y-12" role="status">
    <!-- Ratios, floor, ceiling and corner all mirror `MusicHero`'s outer box.
         The `min-h` is the one that's easy to forget and the one that shows:
         below `sm` the hero's content stack is taller than `4/5` resolves to,
         so a skeleton without it hands over a shorter box and the whole page
         jumps down when the query lands. -->
    <div
      class="aspect-[4/5] min-h-[26rem] w-full animate-pulse rounded-2xl bg-muted sm:aspect-[16/10] sm:min-h-[32rem] sm:rounded-3xl lg:aspect-[21/9] 3xl:max-h-[720px] 4xl:max-h-[780px]"
    />

    <div v-for="shelf in SHELVES" :key="shelf" class="min-w-0 space-y-4">
      <div class="space-y-2">
        <div class="h-6 w-48 animate-pulse rounded bg-muted" />
        <div class="h-4 w-72 max-w-full animate-pulse rounded bg-muted/60" />
      </div>
      <div class="flex gap-4 overflow-hidden">
        <div
          v-for="card in CARDS"
          :key="card"
          class="w-[70%] shrink-0 space-y-3 sm:w-[46%] lg:w-[31%] xl:w-[23.5%] 2xl:w-[19%] 3xl:w-[15.5%] 4xl:w-[13.4%]"
        >
          <div class="aspect-video w-full animate-pulse rounded-xl bg-muted" />
          <div class="h-4 w-4/5 animate-pulse rounded bg-muted" />
          <div class="h-3 w-1/2 animate-pulse rounded bg-muted/60" />
        </div>
      </div>
    </div>
  </div>
</template>
