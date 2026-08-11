<script lang="ts" setup>
import HistoryView from '@/components/history/HistoryView.vue'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Watch history — Streamify' })
</script>

<template>
  <HistoryView />
</template>
