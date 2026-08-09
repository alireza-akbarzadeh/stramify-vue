<script lang="ts" setup>
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import AppSearch from '@/components/search/AppSearch.vue'
import NotificationBell from '@/components/notifications/NotificationBell.vue'
import { MonitorUp, Plus, Radio, SquarePen } from '@lucide/vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu' /**
 * The app shell's top bar: sidebar toggle, search, notifications, theme,
 * account.
 *
 * It carries no page title — the page underneath owns its own heading, which
 * is what lets one bar sit above `/live`, `/watch/...` and `/dashboard` alike.
 *
 * `UserMenu` is the same account menu the public `AppHeader` renders, so the
 * avatar is in the same corner on both sides of the app. It stands in for the
 * sidebar's account control whenever the sidebar is collapsed or off-canvas —
 * and renders nothing at all when signed out.
 */
/**
 * The app shell's top bar: sidebar toggle, search, notifications, theme,
 * account.
 *
 * It carries no page title — the page underneath owns its own heading, which
 * is what lets one bar sit above `/live`, `/watch/...` and `/dashboard` alike.
 *
 * `UserMenu` is the same account menu the public `AppHeader` renders, so the
 * avatar is in the same corner on both sides of the app. It stands in for the
 * sidebar's account control whenever the sidebar is collapsed or off-canvas —
 * and renders nothing at all when signed out.
 */
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-glass px-3 backdrop-blur-xl sm:gap-3 sm:px-6"
  >
    <SidebarTrigger />
    <Separator class="hidden h-5 sm:block" orientation="vertical" />

    <AppSearch />

    <div class="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
      <DropdownMenu class="mr-2">
        <DropdownMenuTrigger class="flex items-center gap-2"> <Plus />Create</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem><MonitorUp /> Upload Video</DropdownMenuItem>
          <DropdownMenuItem><Radio />Go Live</DropdownMenuItem>
          <DropdownMenuItem><SquarePen />Create Post</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NotificationBell />
      <ThemeToggle />
      <UserMenu />
    </div>
  </header>
</template>
