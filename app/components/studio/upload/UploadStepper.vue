<script lang="ts" setup>
import { Check } from '@lucide/vue'
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger
} from '@/components/ui/stepper'

/**
 * Where you are in the upload, and how much is left.
 *
 * A multi-step flow without this is a flow of unknown length, which is the
 * difference between "two more screens" and "how long is this going to take"
 * (UX: `multi-step-progress`).
 *
 * **Every step is wrapped in a `StepperTrigger`, and it has to be.** Reka's
 * `StepperRoot` renders a screen-reader-only "Step 3 of 4" line whose total
 * comes from `totalStepperItems` — a set that *only* `StepperTrigger`
 * registers into. An earlier version of this component left the trigger out to
 * keep the stepper non-interactive, and the announcement silently became
 * "Step 4 of 0": the one part of this component that exists purely for
 * assistive tech was the part that broke.
 *
 * Steps ahead of you are `disabled`, so the trigger registers without offering
 * a jump to a screen whose prerequisites aren't met — a details form with no
 * file behind it. Steps behind you stay live, which makes the numbers a way
 * back and matches what the footer's Back button already does.
 */
defineProps<{ current: number }>()

const emit = defineEmits<{ go: [index: number] }>()

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
        :disabled="index > current"
        :step="index + 1"
        class="flex-1 flex-col items-start gap-2"
    >
      <div class="flex w-full items-center gap-2">
        <StepperTrigger
            :class="[
            'p-0',
            index < current ? 'cursor-pointer' : 'cursor-default'
          ]"
            @click="index < current && emit('go', index)"
        >
          <StepperIndicator
              class="size-8 shrink-0 border border-border bg-surface-2 text-xs font-semibold group-data-[state=active]:border-primary group-data-[state=completed]:border-success/40 group-data-[state=completed]:bg-success/15 group-data-[state=completed]:text-success"
          >
            <Check v-if="index < current" aria-hidden="true" class="size-4 stroke-[2.5]"/>
            <template v-else>{{ index + 1 }}</template>
          </StepperIndicator>
        </StepperTrigger>

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
