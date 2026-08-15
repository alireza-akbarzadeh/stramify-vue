<script setup lang="ts">
import { Film, Radio, Sparkles, Users } from '@lucide/vue'
import StatTile from './StatTile.vue'
import type { PlatformPulse } from '#shared/types/dashboard'

const props = defineProps<{ platform: PlatformPulse }>()

const tiles = computed(() => [
  {
    key: 'live',
    icon: Radio,
    label: 'Channels live now',
    value: String(props.platform.liveChannels),
    to: '/live'
  },
  {
    key: 'viewers',
    icon: Users,
    label: 'Viewers watching',
    value: props.platform.viewersNow,
    // Seeded counts, not a realtime meter — ADR-013. Said plainly rather than
    // animated to look live.
    hint: 'seeded'
  },
  {
    key: 'clips',
    icon: Film,
    label: 'Clips published',
    value: String(props.platform.totalClips),
    to: '/clips'
  },
  {
    key: 'category',
    icon: Sparkles,
    label: 'Busiest category',
    value: props.platform.busiestCategory ?? '—',
    to: props.platform.busiestCategory ? `/category/${props.platform.busiestCategory.toLowerCase()}` : undefined
  }
])
</script>

<template>
  <section aria-labelledby="pulse-heading">
    <h2 id="pulse-heading" class="text-sm font-medium text-muted-foreground">Platform pulse</h2>
    <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        v-for="tile in tiles"
        :key="tile.key"
        :icon="tile.icon"
        :label="tile.label"
        :value="tile.value"
        :hint="tile.hint"
        :to="tile.to"
      />
    </div>
  </section>
</template>
