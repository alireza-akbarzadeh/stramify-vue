<script lang="ts" setup>
import AppSidebar from '@/components/shell/AppSidebar.vue'
import DashboardTopBar from '@/components/shell/DashboardTopBar.vue'
import MobileTabBar from '@/components/shell/MobileTabBar.vue'
import {SidebarInset, SidebarProvider} from '@/components/ui/sidebar'

/**
 * The app shell — sidebar + top bar — for every product surface, not just
 * `/dashboard`. Browse routes (`/live`, `/clips`, `/following`, `/channels`,
 * `/category`, `/watch/...`) opt in with `definePageMeta({ layout: 'dashboard' })`
 * and keep the sidebar instead of each rendering its own header.
 *
 * The shell adds no horizontal padding of its own: the views under it
 * (`DiscoveryFeed`, `ChannelView`, `WatchView`, `DashboardShell`, …) already
 * carry a `max-w` container, and doubling it up would inset them twice.
 *
 * Vertically it does own one thing: the bottom inset that keeps the last row
 * of any page clear of the fixed `MobileTabBar`. That bar is out of flow, so
 * without the padding here it would sit on top of page content on every
 * phone-sized route.
 *
 * `min-w-0` on the inset is load-bearing. `SidebarInset` is a flex item of
 * `SidebarProvider`'s row, and a flex item's default `min-width: auto` floors
 * its width at the min-content size of everything inside it. One wide
 * descendant — a rail of `shrink-0` slides, a grid whose columns can't
 * collapse — therefore doesn't overflow *itself*, it widens the whole main
 * column, and the page grows a horizontal scrollbar. The symptom is worse than
 * a stray scrollbar: the sidebar renders an in-flow spacer plus a `fixed`
 * panel, so scrolling sideways slides the spacer out from under the panel and
 * you see the sidebar twice.
 *
 * Capping it at zero lets the column take the width the sidebar leaves it and
 * makes the scrolling rails inside handle their own overflow, which is what
 * they were built to do. `HomeRail` carries the same class for the same reason
 * one level down.
 */
</script>

<template>
  <SidebarProvider>
    <AppSidebar/>
    <SidebarInset id="main-content" class="min-w-0">
      <DashboardTopBar/>
      <div class="flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <slot/>
      </div>
    </SidebarInset>

    <MobileTabBar/>
  </SidebarProvider>
</template>
