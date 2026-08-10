<script setup lang="ts">
import type { TooltipPlacement } from 'vidstack'

/**
 * Wraps a control in a Vidstack tooltip. The trigger slot takes the actual
 * button — Vidstack handles the hover/focus timing, floating-ui placement and
 * the `aria-describedby` wiring, so this is presentation only.
 *
 * It works with a plain `<button>` as well as a `media-*-button`: Vidstack
 * anchors to the trigger's first child whenever that child is a button or
 * carries `role="button"`, which the theater toggle relies on.
 *
 * Vidstack's stock 700ms hover delay is tuned for a tooltip that explains a
 * page; on a control bar the pointer is already there on purpose, and waiting
 * most of a second reads as the tooltip being broken.
 */
defineProps<{ label: string; placement?: TooltipPlacement }>()
</script>

<template>
  <media-tooltip :show-delay="300">
    <media-tooltip-trigger>
      <slot />
    </media-tooltip-trigger>
    <media-tooltip-content
      class="player-tooltip"
      :placement="placement ?? 'top center'"
      :offset="6"
    >
      {{ label }}
    </media-tooltip-content>
  </media-tooltip>
</template>
