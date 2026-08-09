<script setup lang="ts">
import { Settings } from '@lucide/vue'
import PlayerTooltip from './PlayerTooltip.vue'

/**
 * Playback speed and quality.
 *
 * Both radio groups are populated by Vidstack from what the source actually
 * offers — the quality list is empty for a progressive MP4 and fills in for
 * an HLS stream, which is why nothing here declares levels of its own.
 */
const RADIO_MARKUP = `
  <media-radio class="player-radio">
    <div class="player-radio-check"></div>
    <span data-part="label"></span>
  </media-radio>
`

/**
 * Vidstack reads a real `<template>` child and clones its content once per
 * option. Vue can't hand it one: the compiler treats `<template>` in an SFC as
 * a fragment and never emits the element, and `v-html` only appears to work —
 * the node it writes gets replaced during hydration, so Vidstack is left
 * holding a detached template (`insertBefore` of null) and both lists render
 * empty.
 *
 * Building the node outside Vue's tree avoids both problems. Vue owns nothing
 * inside these groups, so it never patches the clones Vidstack inserts beside
 * the template, and it still tears the whole subtree down with the element on
 * unmount.
 *
 * The `innerHTML` below is the static constant above — no interpolation, and
 * nothing user-supplied ever reaches it. Option labels are filled in by
 * Vidstack through `textContent`, not markup.
 */
function attachRadioTemplate(el: Element | null) {
  if (!el || el.querySelector(':scope > template')) return
  const template = document.createElement('template')
  template.innerHTML = RADIO_MARKUP
  el.prepend(template)
}

/**
 * Ordering, not lazy loading. Vidstack looks the template up one animation
 * frame after the group connects and never retries, so the template has to be
 * in place by then. Creating the groups on the client puts Vue's ref callback
 * in the same flush as the insertion — comfortably inside that frame — whereas
 * hydrating them means they were already connected before Vue ran, and the
 * menu comes up empty.
 */
const ready = ref(false)
onMounted(() => {
  ready.value = true
})
</script>

<template>
  <media-menu>
    <PlayerTooltip label="Settings">
      <media-menu-button class="player-button" aria-label="Settings">
        <Settings aria-hidden="true" />
      </media-menu-button>
    </PlayerTooltip>

    <media-menu-items v-if="ready" class="player-menu-items" placement="top end" :offset="8">
      <div class="player-menu-label">Speed</div>
      <media-speed-radio-group :ref="attachRadioTemplate" normal-label="Normal" />

      <div class="player-menu-label">Quality</div>
      <media-quality-radio-group :ref="attachRadioTemplate" auto-label="Auto" />
    </media-menu-items>
  </media-menu>
</template>
