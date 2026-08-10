<script lang="ts" setup>
import {isNavLinkActive, mobileNavLinks} from '@/utils/nav'

/**
 * The phone-sized primary nav: a fixed bottom tab bar, the pattern every
 * native app (and YouTube) uses, because the top-left hamburger is the one
 * corner of a phone a thumb can't reach.
 *
 * It replaces nothing — the sidebar sheet still holds the full nav behind the
 * top bar's trigger. This is the shortcut to the four destinations that carry
 * the traffic. Hidden from `md` up, where the sidebar is always on screen.
 *
 * `pb-[env(safe-area-inset-bottom)]` keeps the row clear of the iOS home
 * indicator; on everything else the inset is 0 and the bar sits flush.
 */
const route = useRoute()
</script>

<template>
  <nav
      aria-label="Primary"
      class="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-glass pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
  >
    <ul class="grid grid-cols-4">
      <li v-for="link in mobileNavLinks" :key="link.to">
        <NuxtLink
            :aria-current="isNavLinkActive(link.to, route.path) ? 'page' : undefined"
            :to="link.to"
            class="group flex h-14 select-none flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground transition-colors duration-150 aria-[current=page]:text-primary active:scale-[0.97]"
        >
          <span
              class="grid h-7 w-12 place-items-center rounded-full transition-colors duration-150 group-aria-[current=page]:bg-primary/12"
          >
            <component :is="link.icon" aria-hidden="true" class="size-5 stroke-[1.8]"/>
          </span>

          <span class="max-w-full truncate px-1">{{ link.label }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
