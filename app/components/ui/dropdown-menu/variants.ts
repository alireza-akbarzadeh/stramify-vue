/**
 * The shared look of every selectable row in a dropdown menu — plain items,
 * checkbox and radio items, and the trigger of a submenu.
 *
 * It lives here rather than being pasted into each of the four components so
 * "what a highlighted menu row looks like" has one definition. Every literal
 * below is written out in full because Tailwind scans source text; only the
 * joins are composed.
 *
 * Two deliberate deviations from stock shadcn:
 *
 * 1. **The highlight is `surface-3`, not `accent`.** In this design system
 *    `--accent` is the brand cyan (`#06b6d4` light, `#22d3ee` dark), not
 *    shadcn's neutral hover tint — so upstream's
 *    `focus:bg-accent focus:text-accent-foreground` painted a hovered row cyan
 *    with white text, and any menu that overrode just the background (the video
 *    card's ⋮ used `surface-2`, one shade off `--popover`) was left with white
 *    text on near-white. `--surface-3` is the token that already means "one step
 *    above the panel" in both themes. Nothing here touches the text colour: the
 *    row keeps the content's `popover-foreground`, which can't go invisible.
 *
 * 2. **It keys off `[data-highlighted]` as well as `:focus`.** Reka focuses the
 *    row it highlights, but skips the `.focus()` when focus already sits in an
 *    input (see `Menu/MenuItemImpl`); there the attribute flips on its own and a
 *    `:focus`-only rule would leave the row looking inert under the cursor.
 */

/** Both signals Reka can raise for "this is the row under the cursor/caret". */
const HIGHLIGHT = 'focus:bg-surface-3 data-[highlighted]:bg-surface-3'

/** Everything shared by a plain row and an indicator row, minus the padding. */
const BASE
  = 'relative flex cursor-pointer items-center gap-2.5 rounded-sm text-sm outline-hidden transition-colors select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50'

/**
 * Icons default to muted so they read as ornament next to the label, unless the
 * caller has already coloured them (`[class*='text-']`) — which is how an
 * active state, like a filled bookmark, keeps its tint.
 */
const ICONS
  = "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground"

/** `variant="destructive"`: red label, red wash on highlight, red icon. */
const DESTRUCTIVE
  = 'data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:data-[highlighted]:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 dark:data-[variant=destructive]:data-[highlighted]:bg-destructive/20 data-[variant=destructive]:*:[svg]:text-destructive!'

/**
 * A plain row. `py-2` rather than shadcn's `py-1.5`: these menus are the only
 * action a video card exposes on touch, and 1.5 lands under the 44px comfortable
 * target once the 14px label is measured.
 */
export const dropdownMenuItemClass
  = `${BASE} px-2.5 py-2 data-[inset]:pl-8 ${HIGHLIGHT} ${DESTRUCTIVE} ${ICONS}`

/**
 * A checkbox or radio row. Same row, with the left gutter the tick or dot sits
 * in — which is why it can't just take `dropdownMenuItemClass` and add padding:
 * `px-2.5` would win over `pl-8` under tailwind-merge.
 */
export const dropdownMenuIndicatorItemClass
  = `${BASE} py-2 pr-2.5 pl-8 ${HIGHLIGHT} ${ICONS}`

/**
 * The panel itself, shared by a menu and its submenus.
 *
 * `rounded-xl` and the long, low shadow are the project's own popover language
 * (see the sheet and dialog) rather than shadcn's `rounded-md` + `shadow-md`,
 * which reads flat against this app's soft surfaces.
 */
export const dropdownMenuContentClass
  = 'z-50 min-w-[8rem] overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-[0_24px_60px_-24px_var(--shadow-color)]'

/**
 * Open/close motion, per the `motion` skill: overlays animate from `data-state`
 * with `tw-animate-css`, not `motion-v`.
 */
export const dropdownMenuMotionClass
  = 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2'
