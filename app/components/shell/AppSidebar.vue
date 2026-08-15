<script lang="ts" setup>
import {storeToRefs} from 'pinia'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar'

import {useAuthStore} from '@/stores/auth'
import type {NavLink} from '@/utils/nav'
import {creatorLinks, discoverLinks, exploreLinks, libraryLinks} from '@/utils/nav'

import SidebarNavItem from './SidebarNavItem.vue'
import SidebarUserMenu from './SidebarUserMenu.vue'

const {state, isMobile} = useSidebar()

const {isAuthenticated} = storeToRefs(useAuthStore())

const isExpanded = computed(() => {
  return state.value === 'expanded' || isMobile.value
})

const groups = computed<Array<{ label: string; links: NavLink[] }>>(() => [
  {
    label: 'Discover',
    links: discoverLinks
  },
  {
    label: 'Your library',
    links: libraryLinks
  },
  {
    label: 'Explore',
    links: exploreLinks
  },
  ...(isAuthenticated.value
      ? [
        {
          label: 'Creator',
          links: creatorLinks
        }
      ]
      : [])
])
</script>

<template>
  <Sidebar class="border-r border-border/50 bg-background" collapsible="icon">
    <!-- Header -->
    <SidebarHeader class="px-3 pt-3 group-data-[collapsible=icon]:px-2">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
              as-child
              class="h-11 rounded-xl px-2 hover:bg-transparent active:bg-transparent"
              size="lg"
          >
            <NuxtLink aria-label="Streamify home" class="flex items-center" to="/">
              <span
                  aria-hidden="true"
                  class="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-gradient-to-br from-primary to-secondary"
              >
                <svg class="relative size-4 text-white" fill="none" viewBox="0 0 24 24">
                  <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor"/>
                </svg>
              </span>

              <span
                  v-if="isExpanded"
                  class="ml-1 text-[16px] font-bold tracking-tight text-foreground"
              >
                Streamify
              </span>
            </NuxtLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <!-- Navigation -->
    <SidebarContent class="scrollbar-slim overscroll-contain px-2">
      <!--
        Collapsed, the group labels animate to zero height, so the only thing
        left telling Discover from Library is a hairline between the groups.
        The first group doesn't get one — there's nothing above it to divide.
      -->
      <SidebarGroup
          v-for="group in groups"
          :key="group.label"
          class="px-0 py-2 group-data-[collapsible=icon]:border-t group-data-[collapsible=icon]:border-border/50 group-data-[collapsible=icon]:pt-3 group-data-[collapsible=icon]:first:border-t-0"
      >
        <SidebarGroupLabel
            class="mb-1 h-7 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60"
        >
          {{ group.label }}
        </SidebarGroupLabel>

        <SidebarGroupContent>
          <SidebarMenu class="gap-1">
            <SidebarNavItem v-for="link in group.links" :key="link.to" :link="link"/>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <!-- Footer -->
    <SidebarFooter class="border-t border-border/50 p-2">
      <SidebarUserMenu/>
    </SidebarFooter>

    <SidebarRail/>
  </Sidebar>
</template>
