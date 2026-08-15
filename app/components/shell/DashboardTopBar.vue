<script lang="ts" setup>
import AppSearch from '@/components/search/AppSearch.vue'
import SearchSheet from '@/components/search/SearchSheet.vue'
import NotificationBell from '@/components/notifications/NotificationBell.vue'
import {Separator} from '@/components/ui/separator'
import {SidebarTrigger} from '@/components/ui/sidebar'
import CreateMenu from './CreateMenu.vue'

/**
 * The app shell's top bar: sidebar toggle, search, create, notifications,
 * theme, account.
 *
 * It carries no page title — the page underneath owns its own heading, which
 * is what lets one bar sit above `/live`, `/watch/...` and `/dashboard` alike.
 *
 * Search changes shape rather than shrinking: an inline combobox from `sm` up,
 * and below that a sheet behind an icon (`SearchSheet`), because a text field
 * squeezed between six controls on a 360px bar is unusable. Everything to the
 * right of it is a 36px round tap target, which is what makes the mobile bar
 * read as native chrome instead of a shrunken desktop one.
 *
 * `UserMenu` is the same account menu the public `AppHeader` renders, so the
 * avatar is in the same corner on both sides of the app. It stands in for the
 * sidebar's account control whenever the sidebar is collapsed or off-canvas —
 * and renders nothing at all when signed out.
 */
</script>

<template>
  <header
      class="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-glass px-2 backdrop-blur-xl sm:h-16 sm:gap-3 sm:px-6"
  >
    <SidebarTrigger class="size-9 shrink-0 rounded-full sm:size-7 sm:rounded-md"/>
    <Separator class="hidden h-5 sm:block" orientation="vertical"/>

    <AppSearch class="hidden min-w-0 flex-1 sm:block sm:max-w-xl"/>

    <div class="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-2">
      <SearchSheet class="sm:hidden"/>
      <CreateMenu/>
      <NotificationBell/>
      <ThemeToggle
          class="size-9 border-transparent bg-transparent hover:bg-foreground/[0.06] sm:size-10"
      />
      <UserMenu/>
    </div>
  </header>
</template>
