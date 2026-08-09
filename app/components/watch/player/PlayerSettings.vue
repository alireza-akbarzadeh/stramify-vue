<script setup lang="ts">
import { Settings } from '@lucide/vue'
import PlayerTooltip from './PlayerTooltip.vue'

/**
 * Playback speed and quality.
 *
 * Both radio groups are populated by Vidstack from what the source actually
 * offers — the quality list is empty for a progressive MP4 and fills in for
 * an HLS stream, which is why nothing here declares levels of its own.
 *
 * The item markup goes in through `v-html` rather than being written inline:
 * Vidstack clones a real `<template>` DOM node per option, but Vue's compiler
 * treats a bare `<template>` in an SFC as a fragment and never emits the
 * element. `v-html` keeps it as literal markup. The string is a static
 * authored constant — no interpolation, nothing user-supplied.
 */
const RADIO_TEMPLATE = `
  <template>
    <media-radio class="player-radio">
      <div class="player-radio-check"></div>
      <span data-part="label"></span>
    </media-radio>
  </template>
`
</script>

<template>
  <media-menu>
    <PlayerTooltip label="Settings">
      <media-menu-button class="player-button" aria-label="Settings">
        <Settings aria-hidden="true" />
      </media-menu-button>
    </PlayerTooltip>

    <media-menu-items class="player-menu-items" placement="top end" :offset="8">
      <div class="player-menu-label">Speed</div>
      <media-speed-radio-group normal-label="Normal" v-html="RADIO_TEMPLATE" />

      <div class="player-menu-label">Quality</div>
      <media-quality-radio-group auto-label="Auto" v-html="RADIO_TEMPLATE" />
    </media-menu-items>
  </media-menu>
</template>
