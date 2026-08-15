<script setup lang="ts">
import { Check, Copy, Download } from '@lucide/vue'

const props = defineProps<{ codes: string[] }>()
const copied = ref(false)

const asText = computed(() => props.codes.join('\n'))

async function copy() {
  await navigator.clipboard.writeText(asText.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

function download() {
  const url = URL.createObjectURL(new Blob([asText.value], { type: 'text/plain' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: 'streamify-backup-codes.txt' })
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="rounded-xl border border-border bg-surface-2 p-4">
    <ul class="grid grid-cols-2 gap-2 font-mono text-sm text-foreground">
      <li v-for="code in codes" :key="code" class="rounded-lg bg-surface px-2.5 py-1.5 text-center">
        {{ code }}
      </li>
    </ul>
    <div class="mt-4 flex gap-2">
      <button
        type="button"
        class="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="copy"
      >
        <component :is="copied ? Check : Copy" class="size-3.5" aria-hidden="true" />
        {{ copied ? 'Copied' : 'Copy' }}
      </button>
      <button
        type="button"
        class="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="download"
      >
        <Download class="size-3.5" aria-hidden="true" /> Download
      </button>
    </div>
  </div>
</template>
