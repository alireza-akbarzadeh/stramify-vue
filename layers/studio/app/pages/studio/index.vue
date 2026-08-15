<script lang="ts" setup>
definePageMeta({middleware: 'auth', layout: 'studio'})
useHead({title: 'Studio — Streamify'})
</script>

<template>
  <ComingSoon
      description="Your channel at a glance — latest upload, recent numbers and what needs attention."
      title="Studio dashboard"
  />
</template>
