import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: [
    '~/assets/css/main.css',
    // vue-sonner v2 ships its stylesheet as a separate entry instead of
    // bundling it into the JS. Without it the toaster renders an unstyled,
    // unpositioned <ol> at the end of <body> — toasts mount but never show.
    'vue-sonner/style.css',
    // Vidstack's base element styles only. The stock `default/theme.css` and
    // `default/layouts/video.css` are deliberately not loaded — the player
    // wears our own skin (`assets/css/player.css`) over Vidstack's headless
    // elements, so the default layout's styles would only fight it.
    'vidstack/player/styles/base.css',
    '~/assets/css/player.css'
  ],
  modules: ['@pinia/nuxt', '@vueuse/nuxt', '@nuxt/eslint', '@nuxtjs/color-mode'],
  // classSuffix: '' → applies a bare `.dark` / `.light` class on <html>, which is
  // what main.css's `.dark { ... }` block and the `dark:` variant expect.
  colorMode: { classSuffix: '', preference: 'dark', fallback: 'dark' },
  // components/ui/* follows shadcn-vue's convention: imported explicitly via
  // its index.ts barrel, not auto-registered (its own index.ts otherwise
  // collides with the auto-registered component name — NUXT_B3011).
  components: [{ path: '~/components', pathPrefix: false, ignore: ['ui/**'] }],
  vue: {
    // Vidstack's player registers real custom elements (media-player,
    // media-provider, ...) — tell Vue's compiler to leave them as native
    // DOM elements instead of trying to resolve them as Vue components.
    compilerOptions: {
      isCustomElement: (tag) => tag.startsWith('media-')
    }
  },
  vite: {
    plugins: [tailwindcss()]
  },
  runtimeConfig: {
    // Server-only — never exposed to the client bundle.
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    betterAuthSecret: process.env.BETTER_AUTH_SECRET,
    cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    cloudflareStreamApiToken: process.env.CLOUDFLARE_STREAM_API_TOKEN,
    cloudflareR2AccessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    cloudflareR2SecretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    cloudflareR2Bucket: process.env.CLOUDFLARE_R2_BUCKET,
    sentryDsn: process.env.SENTRY_DSN,
    public: {
      appUrl: process.env.PUBLIC_APP_URL || 'http://localhost:3000'
    }
  }
})
