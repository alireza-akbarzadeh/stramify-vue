```vue
<script lang="ts" setup>
import type {NavLink} from '@/utils/nav'
import {isNavLinkActive, mobileNavLinks} from '@/utils/nav'

withDefaults(
    defineProps<{
      links?: NavLink[]
      label?: string
    }>(),
    {
      links: () => mobileNavLinks,
      label: 'Primary',
    },
)

const route = useRoute()
</script>

<template>
  <nav
      :aria-label="label"
      class="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] md:hidden"
  >
    <div
        class="mx-auto max-w-lg overflow-hidden rounded-t-3xl bg-background/85 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/70 dark:shadow-[0_-8px_30px_rgba(0,0,0,0.3)]"
    >
      <ul class="grid grid-cols-5 items-center px-1.5 pt-1.5">
        <li
            v-for="link in links"
            :key="link.to"
            class="relative min-w-0"
        >
          <NuxtLink
              :aria-current="
              isNavLinkActive(link.to, route.path, link.exact)
                ? 'page'
                : undefined
            "
              :to="link.to"
              class="group relative flex h-15 select-none flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium text-muted-foreground outline-none transition-all duration-200 ease-out active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/50 aria-[current=page]:text-foreground"
          >
            <!-- Active background -->
            <span
                class="absolute inset-x-1 top-0.5 h-10 scale-90 rounded-xl bg-primary/0 opacity-0 transition-all duration-200 ease-out group-aria-[current=page]:scale-100 group-aria-[current=page]:bg-primary/10 group-aria-[current=page]:opacity-100"
            />

            <!-- Icon -->
            <span
                class="relative z-10 grid size-7 place-items-center transition-all duration-200 ease-out group-aria-[current=page]:-translate-y-0.5 group-aria-[current=page]:text-primary"
            >
              <component
                  :is="link.icon"
                  aria-hidden="true"
                  class="size-[1.35rem] stroke-[1.8] transition-all duration-200 group-aria-[current=page]:scale-105 group-aria-[current=page]:stroke-[2.2]"
              />
            </span>

            <!-- Label -->
            <span
                class="relative z-10 max-w-full truncate px-1 leading-none transition-all duration-200 group-aria-[current=page]:font-semibold"
            >
              {{ link.label }}
            </span>

            <!-- Active indicator -->
            <span
                class="absolute bottom-0 left-1/2 size-1 -translate-x-1/2 scale-0 rounded-full bg-primary opacity-0 transition-all duration-200 group-aria-[current=page]:scale-100 group-aria-[current=page]:opacity-100"
            />
          </NuxtLink>
        </li>
      </ul>
    </div>
  </nav>
</template>
```
