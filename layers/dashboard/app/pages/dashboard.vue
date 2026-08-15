<script setup lang="ts">
import DashboardOverview from '../components/dashboard/DashboardOverview.vue'
import DashboardShell from '@/components/shell/DashboardShell.vue'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })
useHead({ title: 'Dashboard — Streamify' })
</script>

<template>
  <DashboardShell
    title="Overview"
    description="Your channel, your activity, and what's happening now"
  >
    <DashboardOverview />
  </DashboardShell>
</template>
