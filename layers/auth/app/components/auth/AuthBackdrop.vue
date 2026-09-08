<template>
  <!--
    Cinematic wash built only from theme tokens (no literal colors), so it
    re-tints correctly in light mode instead of staying dark-only.

    The opacities are split per theme rather than shared. Dark mode paints these
    blooms onto #07090d, where /20 of the primary reads as a faint glow; light
    mode paints the same value onto #fafafb, where it reads as flat pink and
    cyan poster paint and drags the whole page away from "premium streaming
    platform". Light therefore gets roughly half the intensity, and the grid
    overlay is lightened too — on a near-white background its 8%-alpha lines
    are far more present than the same lines are on near-black.
  -->
  <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <div
      class="absolute -left-1/4 -top-1/3 size-[820px] rounded-full bg-primary/10 blur-[160px] animate-[float-slow_18s_ease-in-out_infinite] motion-reduce:animate-none dark:bg-primary/20"
    />
    <div
      class="absolute -right-1/4 top-0 size-[720px] rounded-full bg-secondary/10 blur-[150px] animate-[float-slow_22s_ease-in-out_infinite_reverse] motion-reduce:animate-none dark:bg-secondary/20"
    />
    <div
      class="absolute bottom-[-30%] left-1/3 size-[680px] rounded-full bg-accent/6 blur-[150px] animate-[float-slow_26s_ease-in-out_infinite] motion-reduce:animate-none dark:bg-accent/12"
    />
    <div
      class="absolute inset-0 opacity-60 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)] dark:opacity-100"
    />
  </div>
</template>
