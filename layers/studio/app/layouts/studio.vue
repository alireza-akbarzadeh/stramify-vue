<script lang="ts" setup>
import MobileTabBar from '@/components/shell/MobileTabBar.vue'
import StudioSidebar from '../components/studio/StudioSidebar.vue'
import StudioTopBar from '../components/studio/StudioTopBar.vue'
import {SidebarInset, SidebarProvider} from '@/components/ui/sidebar'
import {studioMobileLinks} from '@/utils/nav'

/**
 * The Creator Studio shell — sidebar, app bar, main column — for every route
 * under `/studio`.
 *
 * It is a separate layout rather than a mode of `layouts/dashboard.vue` because
 * the two shells navigate to different places: the dashboard shell is wrapped
 * around browse routes and keeps the whole product's nav, while in here the
 * only nav is this one channel's own. Sharing a shell would mean one sidebar
 * that has to be told which half of itself to hide.
 *
 * Unlike the dashboard shell this one *does* own the horizontal container. The
 * views under it are studio pages — tables, forms, metric grids — which all
 * want the same measure, so putting it here keeps each page down to its own
 * content instead of restating the same wrapper.
 *
 * The bottom padding is the inset that keeps the last row of any page clear of
 * the fixed `MobileTabBar`, which is out of flow and would otherwise sit on top
 * of page content on every phone-sized route.
 */
</script>

<template>
  <SidebarProvider>
    <StudioSidebar/>

    <SidebarInset id="main-content">
      <StudioTopBar/>

      <main class="flex-1 px-4 pb-[calc(3.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 md:pb-10">
        <div class="mx-auto w-full max-w-7xl">
          <slot/>
        </div>
      </main>
    </SidebarInset>

    <MobileTabBar :links="studioMobileLinks" label="Creator Studio"/>
  </SidebarProvider>
</template>
