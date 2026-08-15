<script setup lang="ts">
import { useDashboardOverview } from '../../composables/useDashboardOverview'
import ActivityPanel from './ActivityPanel.vue'
import ChannelPanel from './ChannelPanel.vue'
import DashboardError from './DashboardError.vue'
import DashboardSkeleton from './DashboardSkeleton.vue'
import DashboardWelcome from './DashboardWelcome.vue'
import PulseStrip from './PulseStrip.vue'
import RoadmapCard from './RoadmapCard.vue'
import SecurityStatusCard from './SecurityStatusCard.vue'

const { data, isPending, isError, refetch } = useDashboardOverview()
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-8">
    <DashboardWelcome />

    <DashboardSkeleton v-if="isPending" />

    <DashboardError
      v-else-if="isError || !data"
      title="Couldn't load your dashboard"
      description="The server didn't return your channel and activity numbers. Nothing has changed — try again."
      @retry="refetch()"
    />

    <template v-else>
      <Reveal>
        <PulseStrip :platform="data.platform" />
      </Reveal>

      <Reveal :delay="0.05">
        <ChannelPanel :creator="data.creator" />
      </Reveal>

      <div class="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Reveal :delay="0.1">
          <ActivityPanel :viewer="data.viewer" />
        </Reveal>
        <Reveal :delay="0.15">
          <SecurityStatusCard />
        </Reveal>
      </div>

      <Reveal :delay="0.2">
        <RoadmapCard />
      </Reveal>
    </template>
  </div>
</template>
