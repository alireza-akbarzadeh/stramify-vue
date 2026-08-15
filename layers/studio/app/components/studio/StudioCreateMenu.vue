<script lang="ts" setup>
import {Button} from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {MonitorUp, Plus, Radio} from '@lucide/vue'

/**
 * The studio's one primary action: the button everything a creator makes
 * starts from.
 *
 * Both entries navigate to a real route — the menu is a shortcut into pages
 * that exist, not a stub that swallows the click. Anything that isn't built
 * yet stays out of here until its page is, for the same reason a nav can't
 * hold a dead link.
 */
const items = [
    {label: 'Upload video', to: '/studio/upload', icon: MonitorUp},
    {label: 'Go live', to: '/stream', icon: Radio}
]
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button class="h-9 gap-1.5 px-3 sm:px-4" size="sm">
        <Plus aria-hidden="true"/>
        <!-- Icon-only on phones, but the word stays in the tree as the button's name. -->
        <span class="max-sm:sr-only">Create</span>
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" class="w-52">
      <DropdownMenuItem v-for="item in items" :key="item.to" as-child>
        <NuxtLink :to="item.to" class="flex cursor-pointer items-center gap-2.5">
          <component :is="item.icon" aria-hidden="true"/>
          {{ item.label }}
        </NuxtLink>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
