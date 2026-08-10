<script lang="ts" setup>
import {SidebarMenuButton, SidebarMenuItem, useSidebar} from '@/components/ui/sidebar'
import type {NavLink} from '@/utils/nav'
import {isNavLinkActive} from '@/utils/nav'

/**
 * One row of the app sidebar, in either of the two shapes it has to take: a
 * full-width label row when the sidebar is expanded (or in the mobile sheet,
 * which is always full width), and a centred icon tile when it's collapsed to
 * the rail. Both live here so the two can't drift — the collapsed state used
 * to be whatever fell out of the expanded markup once the text was hidden,
 * which is how the icon ended up off-centre.
 */
const props = defineProps<{ link: NavLink }>()

const route = useRoute()
const {state, isMobile} = useSidebar()

/** Text shows everywhere except the desktop rail. */
const showLabel = computed(() => state.value === 'expanded' || isMobile.value)

const isActive = computed(() => isNavLinkActive(props.link.to, route.path))
</script>

<template>
  <SidebarMenuItem>
    <SidebarMenuButton
        :is-active="isActive"
        :tooltip="link.label"
        as-child
        class="group/nav relative h-10 rounded-xl px-3 text-[13px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted/70 hover:text-foreground data-[active=true]:bg-primary/10 data-[active=true]:text-primary group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:rounded-2xl"
    >
      <NuxtLink
          :to="link.to"
          class="flex min-w-0 flex-1 items-center gap-3 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:gap-0"
      >
        <!--
          The active marker only makes sense against a full-width row. On the
          rail the tile's own tint is the marker, and a 2px bar hard against a
          rounded-2xl edge just reads as a rendering artefact.
        -->
        <span
            v-if="showLabel && isActive"
            aria-hidden="true"
            class="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
        />

        <span
            class="grid size-7 shrink-0 place-items-center rounded-lg transition-colors duration-150 group-hover/nav:bg-background group-data-[collapsible=icon]:size-auto group-data-[collapsible=icon]:bg-transparent"
        >
          <component
              :is="link.icon"
              aria-hidden="true"
              class="size-4.5 stroke-[1.8] group-data-[collapsible=icon]:size-5.5"
          />
        </span>

        <span v-if="showLabel" class="min-w-0 flex-1 truncate">
          {{ link.label }}
        </span>

        <span
            v-if="link.badge && showLabel"
            class="rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground"
        >
          {{ link.badge }}
        </span>
      </NuxtLink>
    </SidebarMenuButton>
  </SidebarMenuItem>
</template>
