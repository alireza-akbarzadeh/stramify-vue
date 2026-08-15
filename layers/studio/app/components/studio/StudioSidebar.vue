<script lang="ts" setup>
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

import AccountAvatar from '@/components/account/AccountAvatar.vue'
import SidebarNavItem from '@/components/shell/SidebarNavItem.vue'
import SidebarUserMenu from '@/components/shell/SidebarUserMenu.vue'

import type {NavLink} from '@/utils/nav'
import {studioLinks, studioManageLinks, studioSettingsLink} from '@/utils/nav'

import {ArrowLeft} from '@lucide/vue'

/**
 * The Creator Studio sidebar — the studio's half of the app shell.
 *
 * It's a sibling of `AppSidebar`, not a variant of it: the two navs never
 * appear together (a route picks one layout or the other), and the studio's
 * header carries something the browse sidebar has no use for — the channel you
 * are currently acting as. The rows themselves are the shared `SidebarNavItem`,
 * so the collapsed rail, the active marker and the tooltips behave identically
 * on both sides of the app.
 */
const {state, isMobile} = useSidebar()
const {user} = useAccountMenu()

/** Text shows everywhere except the desktop rail. */
const isExpanded = computed(() => state.value === 'expanded' || isMobile.value)

const groups = computed<Array<{label: string; links: NavLink[]}>>(() => [
    {label: 'Studio', links: studioLinks},
    {label: 'Manage', links: studioManageLinks}
])
</script>

<template>
  <Sidebar class="border-r border-border/50 bg-background" collapsible="icon">
    <SidebarHeader class="px-3 pt-3 group-data-[collapsible=icon]:px-2">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
              as-child
              class="h-11 rounded-xl px-2 hover:bg-transparent active:bg-transparent"
              size="lg"
          >
            <NuxtLink aria-label="Creator Studio home" class="flex items-center" to="/studio">
              <span
                  aria-hidden="true"
                  class="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-gradient-to-br from-primary to-secondary"
              >
                <svg class="relative size-4 text-white" fill="none" viewBox="0 0 24 24">
                  <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor"/>
                </svg>
              </span>

              <span v-if="isExpanded" class="ml-1 grid leading-tight">
                <span class="text-[15px] font-bold tracking-tight text-foreground">Studio</span>
                <span class="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                  Streamify
                </span>
              </span>
            </NuxtLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <!--
        Who you are publishing as. It's the first thing YouTube Studio shows and
        the reason is the same here: every number and every row further down the
        page belongs to one channel, and a creator with more than one needs that
        stated rather than inferred. Dropped on the rail — a 64px avatar has
        nowhere to go in a 48px column, and the footer's account button is still
        there to answer the same question.
      -->
      <div
          v-if="isExpanded && user"
          class="mt-2 flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-surface-2/60 px-3 py-4 text-center"
      >
        <AccountAvatar class="size-16 border border-border text-lg"/>

        <div class="min-w-0 max-w-full">
          <p class="truncate text-sm font-semibold text-foreground">
            {{ user.name || user.email }}
          </p>
          <p class="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
            Your channel
          </p>
        </div>
      </div>
    </SidebarHeader>

    <SidebarContent class="scrollbar-slim overscroll-contain px-2">
      <!--
        Collapsed, the group labels animate to zero height, so a hairline is all
        that's left telling the daily rows from the settings-ish ones. The first
        group doesn't get one — there's nothing above it to divide.
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

    <SidebarFooter class="gap-2 border-t border-border/50 p-2">
      <SidebarMenu class="gap-1">
        <SidebarNavItem :link="studioSettingsLink"/>

        <!--
          The way out. A studio you can't leave without editing the URL is a
          trap, and the browser back button doesn't help once you've clicked
          three rows deep into it.
        -->
        <SidebarMenuItem>
          <SidebarMenuButton
              as-child
              class="h-10 rounded-xl px-3 text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted/70 hover:text-foreground group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:rounded-2xl"
              tooltip="Back to Streamify"
          >
            <NuxtLink class="flex min-w-0 items-center gap-3" to="/">
              <span
                  class="grid size-7 shrink-0 place-items-center rounded-lg group-data-[collapsible=icon]:size-auto"
              >
                <ArrowLeft aria-hidden="true" class="size-4.5 stroke-[1.8] group-data-[collapsible=icon]:size-5.5"/>
              </span>

              <!-- Hidden, not dropped, on the rail — same reason as `SidebarNavItem`. -->
              <span :class="isExpanded ? 'min-w-0 flex-1 truncate' : 'sr-only'">
                Back to Streamify
              </span>
            </NuxtLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <SidebarUserMenu/>
    </SidebarFooter>

    <SidebarRail/>
  </Sidebar>
</template>
