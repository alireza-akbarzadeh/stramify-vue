<script lang="ts" setup>
import { MonitorUp } from '@lucide/vue'
import StudioPageHeader from '../../../components/studio/StudioPageHeader.vue'
import StudioVideoList from '../../../components/studio/videos/StudioVideoList.vue'
import { Button } from '@/components/ui/button'

definePageMeta({middleware: 'auth', layout: 'studio'})
useHead({title: 'Content — Streamify Studio'})
</script>

<template>
  <div>
    <StudioPageHeader
        description="Everything you've published, with its visibility, views and comments in one place."
        title="Content"
    >
      <template #actions>
        <Button as-child>
          <NuxtLink to="/studio/upload">
            <MonitorUp aria-hidden="true"/>
            Upload
          </NuxtLink>
        </Button>
      </template>
    </StudioPageHeader>

    <StudioVideoList/>
  </div>
</template>
