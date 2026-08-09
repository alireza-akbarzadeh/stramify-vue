<script lang="ts" setup>
import { storeToRefs } from 'pinia'

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

import { useAuthStore } from '@/stores/auth'
import type { NavLink } from '@/utils/nav'
import { creatorLinks, discoverLinks, isNavLinkActive, libraryLinks } from '@/utils/nav'

import SidebarUserMenu from './SidebarUserMenu.vue'

const route = useRoute()

const { state, isMobile } = useSidebar()

const { isAuthenticated } = storeToRefs(useAuthStore())

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

const isActive = (link: NavLink) => {
  return isNavLinkActive(link.to, route.path)
}
</script>

<template>
  <Sidebar class="border-r border-border/50 bg-background" collapsible="icon">
    <!-- Header -->
    <SidebarHeader class="px-3 pt-3">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            as-child
            class="h-11 rounded-xl px-2 hover:bg-transparent active:bg-transparent"
            size="lg"
          >
            <NuxtLink aria-label="Streamify home" to="/">
              <span
                aria-hidden="true"
                class="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-gradient-to-br from-primary to-secondary"
              >
                <svg class="relative size-4 text-white" fill="none" viewBox="0 0 24 24">
                  <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" />
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
    <SidebarContent class="px-2">
      <!-- Existing navigation groups -->
      <SidebarGroup v-for="group in groups" :key="group.label" class="px-0 py-2">
        <SidebarGroupLabel
          class="mb-1 h-7 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60"
        >
          {{ group.label }}
        </SidebarGroupLabel>

        <SidebarGroupContent>
          <SidebarMenu class="gap-1">
            <SidebarMenuItem v-for="link in group.links" :key="link.to">
              <SidebarMenuButton
                :is-active="isActive(link)"
                :tooltip="link.label"
                as-child
                class="group/nav relative h-10 rounded-xl px-3 text-[13px] font-medium text-muted-foreground transition-all duration-150 hover:bg-muted/70 hover:text-foreground data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.08)]"
              >
                <NuxtLink :to="link.to" class="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    :class="isActive(link) ? 'opacity-100' : 'opacity-0'"
                    aria-hidden="true"
                    class="absolute left-0 h-5 w-0.5 rounded-full bg-primary transition-opacity duration-200"
                  />

                  <span
                    class="grid size-7 shrink-0 place-items-center rounded-lg transition-colors duration-150 group-hover/nav:bg-background group-data-[active=true]/nav:bg-primary/10"
                  >
                    <component :is="link.icon" aria-hidden="true" class="size-4.25 stroke-[1.8]" />
                  </span>

                  <span v-if="isExpanded" class="min-w-0 flex-1 truncate">
                    {{ link.label }}
                  </span>

                  <span
                    v-if="link.badge && isExpanded"
                    class="rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground"
                  >
                    {{ link.badge }}
                  </span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <!-- Footer -->
    <SidebarFooter class="border-t border-border/50 p-2">
      <SidebarUserMenu />
    </SidebarFooter>

    <SidebarRail />
  </Sidebar>
</template>
