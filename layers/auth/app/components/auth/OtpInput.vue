<script setup lang="ts">
import { PinInputRoot, PinInputInput } from 'reka-ui'

// Reka's PinInput models `type="number"` as number[]; the parent only ever
// needs the joined string, so the array type is kept internal to this file.
const model = defineModel<number[]>({ required: true })
defineProps<{ id?: string }>()
const emit = defineEmits<{ (e: 'complete', code: string): void }>()
</script>

<template>
  <PinInputRoot
    :id="id"
    v-model="model"
    otp
    type="number"
    placeholder="•"
    class="flex justify-between gap-2"
    @complete="emit('complete', $event.join(''))"
  >
    <PinInputInput
      v-for="i in 6"
      :key="i"
      :index="i - 1"
      inputmode="numeric"
      autocomplete="one-time-code"
      class="h-13 w-full rounded-xl border border-border bg-surface text-center text-lg font-semibold text-foreground shadow-sm transition-all duration-200 outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/35"
    />
  </PinInputRoot>
</template>
