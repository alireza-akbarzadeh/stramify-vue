<template>
  <div class="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
    <div class="min-w-0 space-y-4">
      <div class="aspect-video animate-pulse rounded-xl bg-muted" />
      <div class="h-7 w-3/4 animate-pulse rounded bg-muted" />
      <div class="h-4 w-1/3 animate-pulse rounded bg-muted" />
      <div class="h-16 animate-pulse rounded-lg bg-muted" />
    </div>
    <div class="space-y-4">
      <div v-for="n in 5" :key="n" class="flex gap-3">
        <div class="aspect-video w-32 shrink-0 animate-pulse rounded-lg bg-muted sm:w-40" />
        <div class="flex-1 space-y-2 py-1">
          <div class="h-4 w-full animate-pulse rounded bg-muted" />
          <div class="h-3 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  </div>
</template>
