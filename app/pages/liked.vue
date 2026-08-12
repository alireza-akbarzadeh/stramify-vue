<script lang="ts" setup>
import LikedView from '@/components/liked/LikedView.vue'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Liked videos — Streamify' })
</script>

<template>
  <LikedView />
</template>
