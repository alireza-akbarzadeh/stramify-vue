<script setup lang="ts">
defineProps<{ title: string; subtitle: string }>()
</script>

<template>
  <div class="relative min-h-dvh bg-background">
    <AuthBackdrop />

    <div class="relative mx-auto grid min-h-dvh max-w-7xl lg:grid-cols-2">
      <AuthShowcase />

      <div class="flex flex-col justify-center px-4 py-10 sm:px-8 lg:px-10 xl:px-14">
        <div class="mx-auto w-full max-w-md">
          <div class="mb-8 flex items-center justify-between lg:hidden">
            <BrandMark />
            <ThemeToggle />
          </div>

          <Reveal>
            <!--
              The lift is split by theme because `--shadow-color` is only
              rgba(15,23,42,.08) in light — against a #fafafb page a 70% white
              glass panel with an 8%-alpha border and that shadow had no
              discernible edge, so the form read as loose fields on the
              background rather than as a card. Light therefore derives its
              shadow from `--foreground` via color-mix (a real slate drop
              shadow, still token-driven and still re-tinting with the theme),
              while dark keeps `--shadow-color`, which at .45 alpha on #07090d
              is already doing the job.
            -->
            <div class="rounded-2xl border border-border bg-glass p-7 shadow-[0_28px_70px_-28px_color-mix(in_oklab,var(--foreground)_28%,transparent)] backdrop-blur-2xl sm:p-9 dark:shadow-[0_32px_80px_-32px_var(--shadow-color)]">
              <header>
                <h2 class="text-2xl font-semibold tracking-tight text-foreground">{{ title }}</h2>
                <p class="mt-1.5 text-sm text-muted-foreground">{{ subtitle }}</p>
              </header>

              <div class="mt-7">
                <slot />
              </div>
            </div>
          </Reveal>

          <p class="mt-6 text-center text-sm text-muted-foreground">
            <slot name="footer" />
          </p>
        </div>
      </div>

      <div class="absolute right-6 top-6 hidden lg:block">
        <ThemeToggle />
      </div>
    </div>
  </div>
</template>
