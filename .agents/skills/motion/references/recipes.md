# Motion recipes

Copy-paste patterns beyond the core two in `SKILL.md`. Read `SKILL.md`
first for the Track A vs Track B decision rule and the timing table these
all follow.

## Track A — more Reka UI overlay recipes

All of these follow the same shape: `data-[state=open]:animate-in
data-[state=closed]:animate-out`, plus a directional/scale modifier, plus
`motion-reduce:animate-none`. Duration is `duration-200` unless noted.

### Sheet / Drawer (slides in from an edge)

```vue
<SheetOverlay
  class="fixed inset-0 z-50 bg-background/80
         data-[state=open]:animate-in data-[state=open]:fade-in-0
         data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
/>
<SheetContent
  class="fixed inset-y-0 right-0 z-50 h-full w-3/4 max-w-sm border-l border-border bg-card
         duration-300
         data-[state=open]:animate-in data-[state=open]:slide-in-from-right
         data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right
         motion-reduce:animate-none"
>
```

Use `duration-300` here, not `duration-200` — a full-height panel sliding
the width of the screen reads as more physical motion than a centered
dialog fading in, and needs a touch longer to not feel like a snap.

### Select / Combobox content

```vue
<SelectContent
  class="z-50 rounded-lg border border-border bg-popover shadow-md
         duration-200
         data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95
         data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
         data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2
         motion-reduce:animate-none"
>
```

### Tooltip (snappier — it's a hint, not a decision surface)

```vue
<TooltipContent
  class="z-50 rounded-md bg-foreground px-2 py-1 text-xs text-background
         duration-150
         data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95
         data-[state=closed]:animate-out data-[state=closed]:fade-out-0
         motion-reduce:animate-none"
>
```

Note Reka's Tooltip uses `data-[state=delayed-open]`, not `data-[state=open]`
— check the actual `data-state` value in devtools if a new primitive's
animation silently doesn't fire; it varies by component.

### AlertDialog

Identical to `Dialog` (see `SKILL.md`) — `AlertDialogOverlay` /
`AlertDialogContent` accept the same classes as `DialogOverlay` /
`DialogContent`.

## Track B — motion-v recipes

### Staggered list entrance

```vue
<script setup lang="ts">
import { motion } from 'motion-v'

const container = { hidden: { opacity: 1 }, visible: { transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } } }
</script>

<template>
  <motion.ul initial="hidden" while-in-view="visible" :in-view-options="{ once: true, amount: 0.3 }">
    <motion.li v-for="card in cards" :key="card.id" :variants="item">{{ card.title }}</motion.li>
  </motion.ul>
</template>
```

`[0.16, 1, 0.3, 1]` is this project's standard easing curve expressed as a
motion-v cubic-bezier array (same curve as `Reveal.vue`'s CSS version).

### List item exit animation (needs AnimatePresence — this is content the

page owns, not a Reka primitive, so Track B's `AnimatePresence` is correct
here, unlike overlays)

```vue
<template>
  <AnimatePresence>
    <motion.li
      v-for="item in items"
      :key="item.id"
      :initial="{ opacity: 0, height: 0 }"
      :animate="{ opacity: 1, height: 'auto' }"
      :exit="{ opacity: 0, height: 0 }"
      layout
    >
      {{ item.label }}
    </motion.li>
  </AnimatePresence>
</template>
```

### Scroll-linked (not scroll-triggered) progress bar

`whileInView` fires once when crossing a threshold. For something that
tracks continuously with scroll position — a progress bar, a parallax
layer — use `useScroll` instead:

```vue
<script setup lang="ts">
import { motion, useScroll } from 'motion-v'
const { scrollYProgress } = useScroll()
</script>

<template>
  <motion.div class="fixed inset-x-0 top-0 h-1 origin-left bg-primary" :style="{ scaleX: scrollYProgress }" />
</template>
```

Smooth out the raw progress value with `useSpring(scrollYProgress, { stiffness: 300, damping: 30 })`
if it feels jittery on trackpads.

### Hover/press micro-interaction on a button

Prefer this over new CSS transitions when the interaction has more than
one property changing at different speeds (e.g. scale + shadow):

```vue
<motion.button
  :while-hover="{ scale: 1.03 }"
  :while-tap="{ scale: 0.97 }"
  :transition="{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }"
>
```

For a single transform-only hover effect, plain Tailwind
`transition-transform hover:scale-105` is simpler and cheaper — don't reach
for `motion-v` by default, only when the interaction needs orchestration
plain CSS can't express.

### Spring presets

Use these instead of guessing `stiffness`/`damping`:

| Feel                           | `transition`                                      |
|--------------------------------|---------------------------------------------------|
| Gentle (default choice)        | `{ type: 'spring', stiffness: 100, damping: 20 }` |
| Snappy UI feedback             | `{ type: 'spring', stiffness: 300, damping: 30 }` |
| Bouncy/playful (use sparingly) | `{ type: 'spring', stiffness: 200, damping: 10 }` |

### Route/page transitions

Nuxt's built-in `<NuxtPage>` transition (via `definePageMeta({ transition: {...} })`
or `app.vue`'s `<NuxtLayout>`/`<NuxtPage>` wrapper) drives Vue's native
`<Transition>`, which is CSS-class-based — that's Track A's territory even
though it's not a Reka component, because Nuxt (like Reka) owns the
mount/unmount timing and expects `*-enter-active`/`*-leave-active` CSS
classes, not `motion-v` props. Don't try to put `motion-v` components
directly on `<NuxtPage>`; instead give the transition CSS classes matching
this project's timing table, or wrap individual page-level sections in
`Reveal` if what's actually wanted is a content reveal, not a route
transition.
