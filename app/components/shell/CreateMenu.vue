<script lang="ts" setup>
import {MonitorUp, Plus, Radio} from '@lucide/vue'
import {Button} from '@/components/ui/button'
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu'

/**
 * The app bar's "create" affordance. Icon-only on phones, where the label
 * would cost more width than the bar has; pill with a label from `md` up.
 *
 * Only routes that exist are listed — a menu entry that goes nowhere is worse
 * than no entry, and both destinations below are real pages (each currently
 * behind its own "coming soon" state until Phases 6/7 land).
 */
const items = [
  {label: 'Upload video', icon: MonitorUp, to: '/studio/upload'},
  {label: 'Go live', icon: Radio, to: '/stream'}
]
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
          aria-label="Create"
          class="size-9 rounded-full p-0 [&_svg]:size-5 md:h-9 md:w-auto md:gap-2 md:px-3"
          variant="ghost"
      >
        <Plus/>
        <span class="hidden md:inline">Create</span>
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" class="w-48">
      <DropdownMenuItem v-for="item in items" :key="item.to" as-child class="cursor-pointer py-2.5">
        <NuxtLink :to="item.to">
          <component :is="item.icon" aria-hidden="true"/>
          {{ item.label }}
        </NuxtLink>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
