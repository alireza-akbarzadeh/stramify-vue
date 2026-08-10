<script setup lang="ts">
const columns = [
  {
    title: 'Product',
    links: [
      ['Live', '/live'],
      ['Categories', '/category'],
      ['Clips', '/clips'],
      ['Following', '/following']
    ]
  },
  {
    title: 'Creators',
    links: [
      ['Dashboard', '/dashboard'],
      ['Go live', '/stream'],
      ['Analytics', '/analytics']
    ]
  },
  {
    title: 'Company',
    links: [
      // `/` is the app's home feed now, so the product tour lives here — it's
      // the only entry point left to it.
      ['Why Streamify', '/marketing'],
      ['About', '/about'],
      ['Careers', '/careers'],
      ['Security', '/security']
    ]
  }
]
</script>

<template>
  <footer class="border-t border-border">
    <div class="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
      <div>
        <BrandMark />
        <p class="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
          A next-generation home for live streaming and video, built for creators and their
          communities.
        </p>
        <p class="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground">
          <span class="size-1.5 rounded-full bg-success" aria-hidden="true" />
          All systems operational
        </p>
      </div>

      <div v-for="col in columns" :key="col.title">
        <h3 class="text-sm font-semibold text-foreground">{{ col.title }}</h3>
        <ul class="mt-4 space-y-3">
          <li v-for="[label, to] in col.links" :key="to">
            <NuxtLink
              :to="to"
              class="rounded-md text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {{ label }}
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>

    <div class="border-t border-border">
      <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
        <p>© {{ new Date().getFullYear() }} Streamify. All rights reserved.</p>
        <p>Built with Nuxt · Early access</p>
      </div>
    </div>
  </footer>
</template>
