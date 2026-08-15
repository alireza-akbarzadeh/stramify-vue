<script setup lang="ts">
const channels = [
  { title: 'Building a renderer', category: 'Software & Game Dev', viewers: '12.8K watching', tint: 'from-primary/70 to-secondary/60' },
  { title: 'Late night synths', category: 'Music & Production', viewers: '4.2K watching', tint: 'from-secondary/70 to-accent/60' },
  { title: 'Speedrun marathon', category: 'Retro Games', viewers: '31.5K watching', tint: 'from-accent/60 to-primary/60' },
  { title: 'Ceramics studio', category: 'Art & Making', viewers: '1.9K watching', tint: 'from-primary/60 to-accent/50' },
  { title: 'Kernel debugging', category: 'Programming', viewers: '7.4K watching', tint: 'from-secondary/60 to-primary/70' },
  { title: 'Trail run, live', category: 'IRL & Outdoors', viewers: '2.6K watching', tint: 'from-accent/70 to-secondary/50' }
]

const RADIUS = 300
const step = 360 / channels.length
</script>

<template>
  <!--
    Cylinder of cards: each is rotated around Y then pushed out by RADIUS, and
    the whole ring spins. Pure CSS 3D so it costs no JS per frame, and the
    animation is dropped entirely under prefers-reduced-motion.
  -->
  <div
    class="relative h-75 w-full [perspective:1200px] [mask-image:radial-gradient(ellipse_75%_75%_at_50%_50%,black_55%,transparent)]"
    aria-hidden="true"
  >
    <div
      class="absolute inset-0 [transform-style:preserve-3d] animate-[spin_38s_linear_infinite] motion-reduce:animate-none"
      style="transform: rotateX(-8deg)"
    >
      <div
        v-for="(channel, i) in channels"
        :key="channel.title"
        class="absolute left-1/2 top-1/2 h-46.5 w-33 -translate-x-1/2 -translate-y-1/2 backface-hidden"
        :style="{ transform: `rotateY(${i * step}deg) translateZ(${RADIUS}px)` }"
      >
        <ChannelCard v-bind="channel" />
      </div>
    </div>
  </div>
</template>
