<script setup lang="ts">
import MixView from '@/components/mix/MixView.vue'

/**
 * `/mix/[id]` — a mix opened in full.
 *
 * The id is `"<seed>:<key>"` and carries a colon, which is legal in a path
 * segment. `route.params.id` arrives decoded, so it's used as-is; the
 * composable re-encodes it for the API call.
 */
definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const id = computed(() => String(route.params.id ?? ''))
</script>

<template>
  <MixView :id="id" />
</template>
