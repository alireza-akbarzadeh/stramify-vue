<script lang="ts" setup>
import { Switch } from '@/components/ui/switch'

const yearly = defineModel<boolean>({ required: true })
</script>

<template>
  <div class="flex items-center justify-center gap-3">
    <!-- Monthly -->
    <span
      :class="[
        'text-sm font-medium transition-colors',
        yearly ? 'text-muted-foreground' : 'text-foreground'
      ]"
    >
      Monthly
    </span>

    <Switch v-model="yearly" aria-label="Bill yearly and save 20%" />

    <span
      :class="[
        'text-sm font-medium transition-colors',
        yearly ? 'text-foreground' : 'text-muted-foreground'
      ]"
    >
      Yearly

      <span
        class="ml-1.5 rounded-md bg-success/15 px-1.5 py-0.5 text-[11px] font-medium text-success"
      >
        Save 20%
      </span>
    </span>
  </div>
</template>
