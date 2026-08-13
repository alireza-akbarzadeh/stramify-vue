<script setup lang="ts">
import type { WatchInsights } from '#shared/types/ai'

/**
 * The "what is this" block at the top of the panel: a couple of sentences and
 * the subjects the listing names.
 *
 * The line under it is not boilerplate. Gemini cannot see these videos — its
 * video understanding needs a Files API upload or a YouTube URL, and our
 * sources are arbitrary mp4/HLS — so everything above is read off the same
 * metadata the viewer can see. `basis` distinguishes "the channel wrote a
 * description and this is a reading of it" from "there was no description, so
 * this is a guess from a title", and the copy changes accordingly rather than
 * making the same claim for both.
 */
defineProps<{ insights: WatchInsights }>()
</script>

<template>
  <div class="space-y-3">
    <p class="text-sm leading-relaxed text-foreground">{{ insights.summary }}</p>

    <ul v-if="insights.topics.length" class="flex flex-wrap gap-1.5">
      <li
        v-for="topic in insights.topics"
        :key="topic.label"
        :title="topic.detail"
        class="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
      >
        {{ topic.label }}
      </li>
    </ul>

    <p class="text-[11px] leading-relaxed text-muted-foreground">
      <template v-if="insights.basis === 'description'">
        Written from the channel's description — the assistant hasn't watched the video.
      </template>
      <template v-else>
        This one has no description, so that's from its title and category alone.
      </template>
    </p>
  </div>
</template>
