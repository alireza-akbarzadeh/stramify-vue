<script setup lang="ts">
/**
 * The sign-in chrome: deliberately none.
 *
 * Auth routes were falling through to `default.vue`, which renders `AppHeader`
 * and `AppFooter` — so `/login` drew the marketing nav (with its own "Log in"
 * and "Start streaming" buttons) above a full-bleed auth screen that already
 * carries its own wordmark and theme toggle in `AuthLayout.vue`. Two brand
 * marks, a nav offering the page you are already on, and a footer of product
 * links under a login form.
 *
 * This layout exists to be empty. That is the whole point: an auth page owns
 * the entire viewport, and the only thing it needs from a layout is the
 * `#main-content` landmark the skip link targets (the other three layouts
 * carry the same id). Naming it also means the next auth page added inherits
 * "no chrome" by saying so, rather than inheriting the marketing header by
 * forgetting to.
 *
 * `AuthLayout.vue` is unchanged and still owns everything visible — the
 * backdrop, the showcase column, the card. It is a component rather than a
 * layout because it takes a `title`/`subtitle` per page, which a layout can't.
 */
</script>

<template>
  <main id="main-content">
    <slot />
  </main>
</template>
