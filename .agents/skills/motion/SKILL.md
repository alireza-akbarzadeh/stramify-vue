---
name: motion
description: Motion and animation system for this Nuxt/Vue app. Covers when to use CSS/tw-animate-css data-state animation for Reka UI overlays (Dialog, Sheet, DropdownMenu, Popover, AlertDialog, Select, Tooltip) vs motion-v (Motion for Vue) for content animation (scroll reveals, stagger lists, hover/press micro-interactions, counters, page transitions). Use whenever adding or reviewing any animation/transition, an open/close effect on a dialog/modal/menu/popover, a scroll-triggered reveal, or investigating janky, abrupt, or missing entrance-exit motion.
---

# Motion

This app has **two legitimate animation systems**, not one. Reaching for the
wrong one is exactly how you get janky or missing dialog animations — using
`motion-v` to animate a Reka UI portal fights the library that already owns
that element's mount/unmount lifecycle; using plain CSS for a scroll-driven
counter means reimplementing an intersection observer from scratch.

| Track                         | Library                                          | Owns                                                                                                                                                                |
|-------------------------------|--------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **A — State-driven overlays** | `reka-ui` (Radix pattern) + `tw-animate-css`     | Anything Reka UI mounts/unmounts: `Dialog`, `AlertDialog`, `Sheet`/`Drawer`, `DropdownMenu`, `Popover`, `Select`, `Combobox`, `Tooltip`, `Accordion`, `Collapsible` |
| **B — Content motion**        | `motion-v` (Motion for Vue, v2) + `@vueuse/core` | Everything the page itself renders: scroll reveals, staggered lists, hover/press/drag micro-interactions, counters, marquees, parallax, page/route transitions      |

Installed versions: `motion-v@2.3.0`, `reka-ui@2.10.1`, `tw-animate-css@1.4.0`,
`@vueuse/core@14.4.0`. Verify against `package.json` if it's been a while.

## Decision rule

**Does a Reka UI `*Root` component control whether this element exists in the
DOM?** (Dialog, Popover, DropdownMenu, Accordion, Select, Tooltip, etc.)
→ **Track A.** Animate with `data-[state=…]` + `tw-animate-css` utility
classes on the element Reka renders. Never wrap it in `motion-v`'s
`AnimatePresence` — Reka already runs its own presence/exit-timing state
machine (`reka-ui`'s `usePresence`), and layering a second one on top just
produces races.

**Is this content the page owns directly** (a section revealing on scroll, a
list of cards, a button, a stat counter)? → **Track B.** Reach for `motion-v`,
or for the already-built primitives in `app/components/motion/` first —
don't recreate what's already there.

## Track A — Reka UI overlays (`data-state` + `tw-animate-css`)

Every Reka UI presence primitive (`DialogContent`, `DialogOverlay`,
`DropdownMenuContent`, `PopoverContent`, `AccordionContent`, …) renders a
`data-state="open" | "closed"` attribute, and for positioned popovers also
`data-side="top" | "bottom" | "left" | "right"`. Style directly off those —
no JS, no refs, no watchers.

**Why this works without extra code**: Reka's `Presence` (see
`node_modules/reka-ui/dist/Presence/usePresence.js`) watches for a real CSS
`animationend`/`animationcancel` event before it actually removes a closing
element from the DOM. Give the closing state a `data-[state=closed]:animate-out`
class and Reka **automatically delays unmount** until it finishes — that's
the entire mechanism behind `AccordionContent`'s smooth collapse in
`app/components/landing/FaqSection.vue`, and it's already proven correct in
this codebase.

**This only works with `animation`, not `transition`.** `usePresence` reads
`getComputedStyle(node).animationName` — a plain `transition-*` class never
fires `animationend`, so Reka unmounts immediately and the exit motion never
gets a chance to play. This is the single most common cause of a dialog that
"just disappears": someone reached for `transition-opacity` instead of
`animate-out`.

### The recipe

```vue
<DialogOverlay
  class="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm
         duration-200
         data-[state=open]:animate-in data-[state=open]:fade-in-0
         data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
/>
<DialogContent
  class="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card
         duration-200
         data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95
         data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
         motion-reduce:animate-none"
>
```

Notes:

- `zoom-in-95` / `zoom-out-95` scale from/to 95% — combined with the
  existing `-translate-x-1/2 -translate-y-1/2` centering utility. These
  don't fight: the `animate-in`/`animate-out` keyframes own `transform`
  only while the animation runs, then hand it back to the static Tailwind
  transform utility once `animationend` fires.
- For side-anchored popovers (`DropdownMenuContent`, `PopoverContent`,
  `SelectContent`), add direction from the anchor using `data-side`:
  `data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2
  data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2`.
- Always end with `motion-reduce:animate-none` — this drops the whole
  animation for `prefers-reduced-motion: reduce` instead of just slowing it
  down, matching `Marquee.vue`'s existing convention.
- `duration-200` matches this project's existing `--animate-accordion-down`/
  `-up` timing (200–300ms, `ease-out`) — don't invent a new duration per
  component; see [Timing](#timing).

More recipes (Sheet, Select, Tooltip, AlertDialog) are in
`references/recipes.md`.

## Track B — motion-v (content animation)

Import `motion` from `motion-v`, not `framer-motion` (this is the Vue port,
API is Vue-flavored — several prop names differ from React docs you might
be pattern-matching from):

```vue
<script setup lang="ts">
import { motion } from 'motion-v'
</script>

<template>
  <motion.div :initial="{ opacity: 0, y: 24 }" :while-in-view="{ opacity: 1, y: 0 }" :in-view-options="{ once: true }" />
</template>
```

**Vue-specific gotchas** (these bite anyone copy-pasting from React Framer
Motion docs, including past sessions in this repo):

- The viewport prop is **`inViewOptions`**, not `viewport`. `{ once, amount, margin, root }`.
- Bind object/array props with `:` (`:animate`, `:while-hover`) since they're
  expressions, not string literals.
- `AnimatePresence` must stay in the template unconditionally — put the
  `v-if` / unique `:key` on its child, never on `AnimatePresence` itself, or
  it can't run the exit animation at all.
- Prefer `useReducedMotion()` (from `motion-v`) or `@vueuse/core`'s
  `usePreferredReducedMotion()` over hand-rolling a media query — both are
  already used in `app/components/motion/`.

### Reuse before you build

`app/components/motion/` already has SSR-safe, reduced-motion-aware
primitives — reach for these before writing new `motion-v` code:

| Component      | Behavior                                                                                                                    |
|----------------|-----------------------------------------------------------------------------------------------------------------------------|
| `Reveal.vue`   | Fade+rise on scroll-into-view (CSS transition, not motion-v — see file comment for why). `:distance`, `:delay` for stagger. |
| `Magnetic.vue` | Cursor-following magnetic hover on an inline element. `:strength`.                                                          |
| `CountUp.vue`  | Animates a number up when scrolled into view. Uses `composables/useCountUp.ts`.                                             |
| `Marquee.vue`  | Infinite seamless scroll track, pauses on hover, `motion-reduce:animate-none`.                                              |

For anything past what these cover — staggered lists, drag, gesture-driven
cards, scroll-linked (not just scroll-triggered) effects, page transitions —
see `references/recipes.md` for `motion-v` patterns (`useScroll`,
`AnimatePresence` list exits, stagger variants, spring presets).

## Timing — reuse these, don't invent new ones

This app already has an established rhythm; match it instead of picking
arbitrary numbers per component.

| Use                                                 | Duration                                                          | Easing                                               |
|-----------------------------------------------------|-------------------------------------------------------------------|------------------------------------------------------|
| Overlay open/close (Track A: dialog, menu, popover) | `duration-200`                                                    | tw-animate default (`ease-out`)                      |
| Accordion/collapsible expand                        | 200–300ms (`--animate-accordion-down/-up`, already in `main.css`) | `ease-out`                                           |
| Section/card scroll reveal (Track B)                | 700ms                                                             | `cubic-bezier(0.16, 1, 0.3, 1)` — see `Reveal.vue`   |
| Hover/press micro-interaction (Track B)             | 200–300ms                                                         | `cubic-bezier(0.16, 1, 0.3, 1)` — see `Magnetic.vue` |
| Instant feedback (toggle, checkbox)                 | 150ms                                                             | linear/ease                                          |

`cubic-bezier(0.16, 1, 0.3, 1)` is this project's "expo-out" curve — fast
start, long gentle settle. It's already used in three places
(`Reveal.vue`, `Magnetic.vue`, the accordion keyframes); keep using it for
anything that isn't a Track A `tw-animate-css` utility (those default to
`ease-out`, which is close enough and not worth overriding).

## Accessibility (non-negotiable — PROMPT.md §17)

Every animation needs a reduced-motion path:

- **Track A**: `motion-reduce:animate-none` on the animated element.
- **Track B**: gate with `useReducedMotion()` / `usePreferredReducedMotion()`,
  or use the CSS `motion-reduce:` variant if the effect is transform/opacity
  only (see `Reveal.vue`, `Magnetic.vue`).
- Content must never depend on JS/animation firing to become visible or
  readable — `Reveal.vue`'s comment on this is the model to follow: the
  element is always in the DOM, only `opacity`/`transform` change.

## Common pitfalls

1. **Reka overlay with `transition-*` instead of `animate-in`/`animate-out`.**
   Looks fine on open, snaps shut instead of animating closed — because
   `usePresence` never sees an `animationend` event. Use `animate-*`
   utilities for anything Reka mounts/unmounts.
2. **No animation at all on a Reka overlay.** This was the actual bug in
   this codebase before this skill existed — `DialogContent`/`DialogOverlay`
   in `ClipPlayerModal.vue` and `DropdownMenuContent` in `UserMenu.vue` had
   no `data-state` classes, so they just popped in/out. Fixed as the
   reference example — diff those two files for the pattern.
3. **Wrapping a Reka overlay in `motion-v`'s `AnimatePresence`.** Redundant
   at best (Reka already handles this) and at worst the two exit-timing
   state machines race and one wins arbitrarily.
4. **Using `viewport` prop on a `motion-v` component.** That's the React
   Framer Motion name; the Vue port is `inViewOptions`. Silently does
   nothing if you use `viewport`.
5. **Animating `top`/`left`/`width`/`height` instead of `transform`.**
   Triggers layout, not hardware-accelerated. Use `x`/`y`/`scale` (motion-v)
   or `translate`/`scale` utilities (Track A).
6. **A new easing curve or duration per component.** Check
   [Timing](#timing) first — inconsistent motion reads as sloppier than no
   motion at all.
