<script setup lang="ts">
import type { Component } from 'vue'
import { Eye, EyeOff } from '@lucide/vue'

const props = defineProps<{
  id: string
  label: string
  type?: string
  autocomplete?: string
  placeholder?: string
  icon?: Component
  error?: string
  /** Focus on mount. Set on the first field of a form, never on more than one. */
  autofocus?: boolean
}>()

const modelValue = defineModel<string>({ required: true })
const revealed = ref(false)

const isPassword = computed(() => props.type === 'password')
const inputType = computed(() => (isPassword.value && revealed.value ? 'text' : props.type || 'text'))

/*
 * Focused imperatively rather than with the `autofocus` attribute. The
 * attribute is only honoured while the browser is parsing the initial HTML,
 * so it works on a cold load of /login but does nothing when the same page is
 * reached by client-side navigation (the "Sign up" / "Log in" links at the
 * foot of every auth card) — the field would be focused or not depending on
 * how you arrived, which is exactly the kind of inconsistency that is hard to
 * notice in review.
 *
 * Skipped when the pointer is coarse: on a phone, focusing on mount throws up
 * the on-screen keyboard and scrolls the card out of view before the user has
 * read the heading.
 */
const input = useTemplateRef<HTMLInputElement>('input')

onMounted(() => {
  if (!props.autofocus) return
  if (window.matchMedia('(pointer: coarse)').matches) return
  input.value?.focus()
})
</script>

<template>
  <div class="space-y-1.5">
    <label :for="id" class="text-sm font-medium text-foreground">{{ label }}</label>

    <div class="relative">
      <component
        :is="icon"
        v-if="icon"
        class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <!--
        `bg-surface-2`, not `bg-surface`: the auth card is a glass panel over
        `--surface`, so a `--surface` field was the same value as the thing
        behind it and the inputs lost their edges in both themes. `--surface-2`
        steps away from the card in each — down to #f7f8fb inside a white card
        in light, up to #151923 inside #10131b in dark — so a field reads as a
        field either way, and focus returns it to `--surface` so the active
        field is the brightest thing in the form.
      -->
      <input
        :id="id"
        ref="input"
        v-model="modelValue"
        :type="inputType"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${id}-error` : undefined"
        required
        :class="[
          'h-12 w-full rounded-xl border border-border bg-surface-2 text-foreground shadow-sm transition-all duration-200 outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-primary/35 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30',
          icon ? 'pl-10' : 'pl-3.5',
          isPassword ? 'pr-11' : 'pr-3.5'
        ]"
      >
      <button
        v-if="isPassword"
        type="button"
        class="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :aria-label="revealed ? 'Hide password' : 'Show password'"
        @click="revealed = !revealed"
      >
        <component :is="revealed ? EyeOff : Eye" class="size-4" aria-hidden="true" />
      </button>
    </div>

    <p v-if="error" :id="`${id}-error`" class="text-sm text-destructive" role="alert">{{ error }}</p>
  </div>
</template>
