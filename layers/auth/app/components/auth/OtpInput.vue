<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { PinInputRoot, PinInputInput } from 'reka-ui'

// Reka's PinInput models `type="number"` as number[]; the parent only ever
// needs the joined string, so the array type is kept internal to this file.
const model = defineModel<number[]>({ required: true })
defineProps<{ id?: string }>()
const emit = defineEmits<{ (e: 'complete', code: string): void }>()

/*
 * The challenge replaces the credentials form in place, so nothing moves focus
 * on its own: the user was typing a moment ago and is now looking at six empty
 * boxes with the caret still on a button behind them. Focusing the first box
 * on mount makes the step immediately typeable, and matters more here than on
 * an ordinary field because authenticator codes expire — every second spent
 * hunting for the cursor is a second of a 30-second window.
 *
 * Coarse pointers are skipped for the same reason as `AuthFormField`: raising
 * the keyboard on mount scrolls the card out of view on a phone.
 */
// `ref` on a Reka component resolves to the component instance, so the host
// element has to come from `$el` rather than the ref directly.
const root = useTemplateRef<ComponentPublicInstance>('root')

onMounted(() => {
  if (window.matchMedia('(pointer: coarse)').matches) return
  const el = root.value?.$el as HTMLElement | undefined
  el?.querySelector('input')?.focus()
})
</script>

<template>
  <PinInputRoot
    :id="id"
    ref="root"
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
      class="h-13 w-full rounded-xl border border-border bg-surface-2 text-center text-lg font-semibold text-foreground shadow-sm transition-all duration-200 outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-primary/35"
    />
  </PinInputRoot>
</template>
