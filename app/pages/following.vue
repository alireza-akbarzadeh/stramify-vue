<script setup lang="ts">
import FollowingView from '@/components/following/FollowingView.vue'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Following — Streamify' })
</script>

<template>
  <FollowingView />
</template>
