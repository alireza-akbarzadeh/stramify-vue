<script setup lang="ts">
import type { ClipPerformance } from '#shared/types/dashboard'

defineProps<{ clips: ClipPerformance[] }>()
</script>

<template>
  <div class="rounded-2xl border border-border bg-card">
    <div class="border-b border-border px-5 py-4">
      <h3 class="text-base font-semibold text-foreground">Top clips</h3>
      <p class="mt-0.5 text-xs text-muted-foreground">Your clips by lifetime views.</p>
    </div>

    <p v-if="clips.length === 0" class="px-5 py-8 text-center text-sm text-muted-foreground">
      No clips published under your handle yet.
    </p>

    <!-- Horizontal scroll rather than hiding columns: likes and comments are the
         point of the table, so dropping them on a phone would leave a view-count
         list that the metric tiles already cover. -->
    <div v-else class="overflow-x-auto">
      <table class="w-full min-w-[500px] text-sm">
        <caption class="sr-only">Your clips ranked by lifetime views, with engagement counts</caption>
        <thead>
          <tr class="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" class="px-5 py-3 text-left font-medium">Clip</th>
            <th scope="col" class="px-3 py-3 text-right font-medium">Views</th>
            <th scope="col" class="px-3 py-3 text-right font-medium">Likes</th>
            <th scope="col" class="px-3 py-3 text-right font-medium">Comments</th>
            <th scope="col" class="px-5 py-3 text-right font-medium">Published</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="clip in clips"
            :key="clip.id"
            class="border-b border-border/60 last:border-0 transition-colors hover:bg-surface-2/60"
          >
            <th scope="row" class="max-w-[300px] px-5 py-3 text-left font-normal">
              <NuxtLink
                :to="`/watch/${clip.id}`"
                class="block truncate font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {{ clip.title }}
              </NuxtLink>
              <span class="text-xs text-muted-foreground">{{ clip.category }}</span>
            </th>
            <td class="px-3 py-3 text-right tabular-nums text-foreground">{{ clip.views }}</td>
            <td class="px-3 py-3 text-right tabular-nums text-muted-foreground">{{ clip.likes }}</td>
            <td class="px-3 py-3 text-right tabular-nums text-muted-foreground">{{ clip.comments }}</td>
            <td class="px-5 py-3 text-right text-xs text-muted-foreground">{{ clip.publishedAt }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
