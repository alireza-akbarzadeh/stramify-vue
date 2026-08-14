<script setup lang="ts">
/**
 * The four-pointed spark that means "ask the model" across the app.
 *
 * Drawn here rather than pulled from `@lucide/vue` because Lucide's `Sparkles`
 * is a big star plus two small ones — busy at 16px, and it reads as "magic
 * effect" rather than "assistant". This is one glyph with concave sides, which
 * stays legible down to the size the actions row uses it at.
 *
 * `currentColor` throughout, so it inherits from the button like every other
 * icon on the row. Sized by the caller's `[&_svg]:size-*`, matching how the
 * Lucide icons behave inside `ui/button`.
 */
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <!-- Each quadrant is a quarter-ellipse pulled in toward the centre, which
         is what gives the star its pinched waist instead of straight edges. -->
    <path
      d="M12 1.5c0 5.799 4.701 10.5 10.5 10.5-5.799 0-10.5 4.701-10.5 10.5C12 16.701 7.299 12 1.5 12 7.299 12 12 7.299 12 1.5Z"
    />
  </svg>
</template>
