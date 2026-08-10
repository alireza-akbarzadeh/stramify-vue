<script lang="ts" setup>
import AppSidebar from '@/components/dashboard/AppSidebar.vue'
import DashboardTopBar from '@/components/dashboard/DashboardTopBar.vue'
import MobileTabBar from '@/components/dashboard/MobileTabBar.vue'
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
 */
</script>

<template>
  <SidebarProvider>
    <AppSidebar/>
    <SidebarInset id="main-content">
      <DashboardTopBar/>
      <div class="flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <slot/>
      </div>
    </SidebarInset>

    <MobileTabBar/>
  </SidebarProvider>
</template>
