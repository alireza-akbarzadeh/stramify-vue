<script setup lang="ts">
import DashboardShell from '@/components/shell/DashboardShell.vue'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })
useHead({ title: 'Go live — Streamify' })
</script>

<template>
  <DashboardShell title="Go live" description="Ingest, stream key, title and category">
    <ComingSoon
      title="Stream configuration"
      description="Ingest URL, stream key, title, and category — built in Phase 7 (Live Streaming)."
    />
  </DashboardShell>
</template>
