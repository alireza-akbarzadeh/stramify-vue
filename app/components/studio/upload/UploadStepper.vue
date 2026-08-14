<script lang="ts" setup>
import { Check } from '@lucide/vue'
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle
} from '@/components/ui/stepper'

/**
 * Where you are in the upload, and how much is left.
 *
 * A multi-step flow without this is a flow of unknown length, which is the
 * difference between "two more screens" and "how long is this going to take"
 * (UX: `multi-step-progress`).
 *
 * Deliberately not interactive: Reka's `StepperTrigger` would let a creator
 * jump to a step whose prerequisites aren't met — a details form with no file
 * behind it. Back and Continue are the only ways through, and they're the two
 * the footer already offers.
 */
defineProps<{ current: number }>()

const steps = [
  { title: 'File', description: 'Pick what to upload' },
  { title: 'Details', description: 'Title and thumbnail' },
  { title: 'Visibility', description: 'Who can watch' },
  { title: 'Done', description: 'Published' }
]
</script>

<template>
  <Stepper :model-value="current + 1" class="w-full">
    <StepperItem
        v-for="(step, index) in steps"
        :key="step.title"
        :step="index + 1"
        class="flex-1 flex-col items-start gap-2"
    >
      <div class="flex w-full items-center gap-2">
        <StepperIndicator
            class="size-8 shrink-0 border border-border bg-surface-2 text-xs font-semibold group-data-[state=active]:border-primary group-data-[state=completed]:border-success/40 group-data-[state=completed]:bg-success/15 group-data-[state=completed]:text-success"
        >
          <Check v-if="index < current" aria-hidden="true" class="size-4 stroke-[2.5]"/>
          <template v-else>{{ index + 1 }}</template>
        </StepperIndicator>

        <!-- Not on the last item — a separator after it would trail into nothing. -->
        <StepperSeparator
            v-if="index < steps.length - 1"
            class="h-0.5 w-full rounded-full group-data-[state=completed]:bg-success/40"
        />
      </div>

      <div class="min-w-0">
        <StepperTitle
            class="block text-xs font-semibold text-muted-foreground group-data-[state=active]:text-foreground"
        >
          {{ step.title }}
        </StepperTitle>
        <!-- Hidden on phones: four descriptions across a 375px screen is four
             truncated fragments, and the titles alone still say where you are. -->
        <StepperDescription class="hidden text-[11px] text-muted-foreground/70 sm:block">
          {{ step.description }}
        </StepperDescription>
      </div>
    </StepperItem>
  </Stepper>
</template>
