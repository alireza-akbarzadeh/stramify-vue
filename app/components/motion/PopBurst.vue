<script setup lang="ts">
/**
 * One-shot feedback for a control that just turned *on*: the slotted icon pops
 * (or rings), and a ring of sparks flies out from behind it.
 *
 * `trigger` is a value, not a method — the parent stays declarative and the
 * burst plays whenever that value *changes to something truthy*. A boolean
 * covers a toggle (`:trigger="isFollowing"`); a counter covers an action with
 * no on-state, like share (`:trigger="shareCount"`). It never fires on mount,
 * so a page that loads with the like already set doesn't celebrate itself.
 *
 * CSS keyframes rather than motion-v (Track B, see the `motion` skill): this
 * sits inside buttons that are on screen from first paint, so it has to be
 * SSR-safe and cost nothing until it's used. Replaying is the one trick —
 * re-keying the elements remounts them, which is what restarts an animation
 * that has already run.
 */
const props = withDefaults(
  defineProps<{
    /** Play the burst whenever this changes to a truthy value. */
    trigger: unknown
    /** How the icon itself reacts. */
    effect?: 'pop' | 'ring'
    /** Sparks in the burst. `0` leaves just the icon animation. */
    sparks?: number
  }>(),
  { effect: 'pop', sparks: 6 }
)

/** Bumped per burst. `0` means "hasn't played yet", which is also the SSR state. */
const run = ref(0)

watch(
  () => props.trigger,
  (value) => {
    if (value) run.value += 1
  }
)

const angles = computed(() =>
  Array.from({ length: props.sparks }, (_, index) => (360 / props.sparks) * index)
)
</script>

<template>
  <span class="relative inline-grid place-items-center">
    <!--
      Sparks inherit `currentColor`, so they pick up whatever the button is
      already using for its active state instead of hard-coding a colour.
      `motion-reduce:animate-none` leaves them at their base `opacity-0`
      (PROMPT.md §17) — nothing to see, nothing to clean up.
    -->
    <span
      v-if="run && sparks"
      :key="`sparks-${run}`"
      class="pointer-events-none absolute inset-0"
      aria-hidden="true"
    >
      <span
        v-for="angle in angles"
        :key="angle"
        class="absolute left-1/2 top-1/2 size-1 rounded-full bg-current opacity-0 animate-spark motion-reduce:animate-none"
        :style="{ '--spark-angle': `${angle}deg` }"
      />
    </span>

    <span
      :key="`icon-${run}`"
      class="grid place-items-center motion-reduce:animate-none"
      :class="run && (effect === 'ring' ? 'animate-bell-ring' : 'animate-pop')"
    >
      <slot />
    </span>
  </span>
</template>
