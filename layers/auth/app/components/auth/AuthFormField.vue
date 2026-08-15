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
}>()

const modelValue = defineModel<string>({ required: true })
const revealed = ref(false)

const isPassword = computed(() => props.type === 'password')
const inputType = computed(() => (isPassword.value && revealed.value ? 'text' : props.type || 'text'))
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
      <input
        :id="id"
        v-model="modelValue"
        :type="inputType"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${id}-error` : undefined"
        required
        :class="[
          'h-12 w-full rounded-xl border border-border bg-surface text-foreground shadow-sm transition-all duration-200 outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/35 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30',
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
