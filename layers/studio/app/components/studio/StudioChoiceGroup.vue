<script lang="ts" setup generic="T extends string">
import type { Component } from 'vue'
import { useId } from 'reka-ui'

export interface Choice<T extends string> {
  value: T
  label: string
  /** One line under the label saying what picking this means. */
  detail?: string
  icon?: Component
}

/**
 * A group of selectable cards, backed by real radio inputs.
 *
 * Used three times in the studio — what you're uploading, which category, and
 * who can see it — which is why it's a component rather than three sets of
 * buttons. Cards instead of a `<select>` because each option carries a
 * consequence worth reading before choosing ("Everyone can find it"), and a
 * select hides all but one of them behind a click.
 *
 * The input is a visually-hidden `<input type="radio">`, not a `div` with
 * `role="radio"`: arrow-key navigation, the roving tab stop, form association
 * and screen-reader announcement all come free and correct from the browser,
 * and every hand-rolled version of this gets at least one of them wrong.
 */
const props = defineProps<{
  modelValue: T
  choices: Choice<T>[]
  /** Accessible name for the group — required, since the cards alone don't say what's being chosen. */
  label: string
  /** Cards per row from `sm` up. One column on phones regardless. */
  columns?: 2 | 3
}>()

const emit = defineEmits<{ 'update:modelValue': [value: T] }>()

// Shared across the group so the radios are mutually exclusive, and unique per
// instance so two groups on the same step don't fight over each other.
const name = useId()

const columnClass = computed(() =>
  props.columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'
)
</script>

<template>
  <fieldset class="min-w-0">
    <legend class="sr-only">{{ label }}</legend>

    <div :class="['grid grid-cols-1 gap-3', columnClass]">
      <label
          v-for="choice in choices"
          :key="choice.value"
          :class="[
          'group relative flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors duration-200',
          // The selected card is stated three ways — border, tint and a check —
          // because colour alone is not an indicator (UX: color-not-only).
          modelValue === choice.value
            ? 'border-primary bg-primary/[0.06]'
            : 'border-border bg-surface-2/40 hover:border-foreground/20 hover:bg-surface-2/70',
          // The ring is drawn on the label, since the input itself is hidden.
          'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background'
        ]"
      >
        <input
            :checked="modelValue === choice.value"
            :name="name"
            :value="choice.value"
            class="sr-only"
            type="radio"
            @change="emit('update:modelValue', choice.value)"
        >

        <component
            :is="choice.icon"
            v-if="choice.icon"
            :class="[
            'mt-0.5 size-5 shrink-0 stroke-[1.8] transition-colors duration-200',
            modelValue === choice.value ? 'text-primary' : 'text-muted-foreground'
          ]"
            aria-hidden="true"
        />

        <span class="min-w-0">
          <span class="block text-sm font-semibold text-foreground">{{ choice.label }}</span>
          <span v-if="choice.detail" class="mt-1 block text-xs leading-relaxed text-muted-foreground">
            {{ choice.detail }}
          </span>
        </span>
      </label>
    </div>
  </fieldset>
</template>
