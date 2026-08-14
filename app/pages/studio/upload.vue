<script lang="ts" setup>
import StudioPageHeader from '@/components/studio/StudioPageHeader.vue'
import UploadWizard from '@/components/studio/upload/UploadWizard.vue'

definePageMeta({middleware: 'auth', layout: 'studio'})
useHead({title: 'Upload — Streamify Studio'})
</script>

<template>
  <div>
    <StudioPageHeader
        description="Publish a video or a track. Nothing goes anywhere until you choose who can see it."
        title="Upload"
    />

    <UploadWizard/>
  </div>
</template>
