<script lang="ts" setup>
import {Separator} from '@/components/ui/separator'
import {SidebarTrigger} from '@/components/ui/sidebar'
import NotificationBell from '@/components/notifications/NotificationBell.vue'
import StudioCreateMenu from './StudioCreateMenu.vue'

/**
 * The studio's app bar: sidebar toggle, then the create/notify/theme/account
 * cluster on the right.
 *
 * Like `DashboardTopBar` it carries no page title — the page underneath owns
 * its heading, which is what lets one bar sit above the dashboard, the content
 * table and the analytics view alike.
 *
 * The wordmark on the left is phone-only. From `md` up the sidebar is on screen
 * with the same mark at the top of it, and repeating it two centimetres away
 * just spends the bar's quietest space saying something already said.
 */
</script>

<template>
  <header
      class="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-glass px-3 backdrop-blur-xl sm:gap-3 sm:px-6"
  >
    <SidebarTrigger/>
    <Separator class="hidden h-5 sm:block" orientation="vertical"/>

    <NuxtLink aria-label="Creator Studio home" class="flex items-center gap-2 md:hidden" to="/studio">
      <span
          aria-hidden="true"
          class="grid size-7 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-secondary"
      >
        <svg class="size-3.5 text-white" fill="none" viewBox="0 0 24 24">
          <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor"/>
        </svg>
      </span>
      <span class="text-sm font-bold tracking-tight text-foreground">Studio</span>
    </NuxtLink>

    <div class="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
      <StudioCreateMenu/>
      <NotificationBell/>
      <ThemeToggle/>
      <UserMenu/>
    </div>
  </header>
</template>
