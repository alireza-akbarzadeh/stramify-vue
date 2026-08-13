<script setup lang="ts">
/**
 * A row of one-tap questions — the model's opening suggestions before anyone
 * has asked anything, and its follow-ups after each answer.
 *
 * One component for both because they are the same affordance twice: a phrase
 * you press to put in the box. Tapping fills the composer rather than sending,
 * so a suggestion is a starting point you can edit, not a button that spends a
 * request on your behalf.
 */
defineProps<{ label: string; prompts: string[]; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'pick', prompt: string): void }>()
</script>

<template>
  <div v-if="prompts.length" class="space-y-2">
    <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {{ label }}
    </p>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="prompt in prompts"
        :key="prompt"
        type="button"
        :disabled="disabled"
        class="cursor-pointer rounded-full border border-border bg-surface-2 px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        @click="emit('pick', prompt)"
      >
        {{ prompt }}
      </button>
    </div>
  </div>
</template>
