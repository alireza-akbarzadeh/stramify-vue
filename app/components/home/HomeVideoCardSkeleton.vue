<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'

/**
 * One card's placeholder, built to occupy the **exact** height of a real
 * `HomeVideoCard` so the grid doesn't reflow when the feed arrives.
 *
 * That's why the text bars aren't `h-3`-and-eyeball-it. Each one sits in a
 * flex box whose height is the line box it stands in for, expressed in `em`
 * so it tracks the font size:
 *
 * | Card element | Classes | Line box |
 * |---|---|---|
 * | title (2 lines) | `text-sm leading-snug` | `1.375em` each |
 * | channel, meta | `text-xs` (line-height `1/0.75`) | `1.333em` each |
 *
 * The card's optional reason line is deliberately not mirrored — it appears on
 * a minority of cards, and reserving space for it would leave a gap under
 * every card that doesn't have one.
 */
const TITLE_WIDTHS = ['w-full', 'w-3/5']
</script>

<template>
  <article aria-hidden="true">
    <Skeleton class="aspect-video w-full rounded-xl" />

    <div class="mt-3 flex gap-3">
      <Skeleton class="size-9 shrink-0 rounded-full" />

      <div class="min-w-0 flex-1 pr-8">
        <!-- Title: two lines at text-sm/leading-snug. -->
        <div class="text-sm leading-snug">
          <div v-for="width in TITLE_WIDTHS" :key="width" class="flex h-[1.375em] items-center">
            <Skeleton :class="['h-[0.85em] rounded-sm', width]" />
          </div>
        </div>

        <!-- Channel, then the meta line — both text-xs, the first with mt-1. -->
        <div class="mt-1 text-xs">
          <div class="flex h-[1.333em] items-center">
            <Skeleton class="h-[0.85em] w-2/5 rounded-sm" />
          </div>
          <div class="flex h-[1.333em] items-center">
            <Skeleton class="h-[0.85em] w-3/5 rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  </article>
</template>
