<script setup lang="ts">
import { Volume1, Volume2, VolumeX } from '@lucide/vue'
import PlayerTooltip from './PlayerTooltip.vue'

/**
 * Mute toggle with a slider that expands on hover. Vidstack puts `data-muted`
 * and `data-state="muted|low|high"` on the button, so which icon shows is a
 * CSS concern (see `player.css`) rather than reactive state duplicated here.
 */
</script>

<template>
  <div class="player-volume">
    <PlayerTooltip label="Mute (m)">
      <media-mute-button class="player-button">
        <VolumeX data-when-on aria-hidden="true" />
        <Volume2 data-when-off aria-hidden="true" />
        <Volume1 data-when-low aria-hidden="true" />
      </media-mute-button>
    </PlayerTooltip>

    <media-volume-slider class="player-volume-slider" aria-label="Volume">
      <div class="player-track" />
      <div class="player-track player-track-fill" />
      <div class="player-thumb" />
    </media-volume-slider>
  </div>
</template>
