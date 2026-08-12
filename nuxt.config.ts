import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      // Matches the manifest's `lang`. Lighthouse's PWA/a11y audits both flag
      // a document with no language, and Nuxt does not set one by default.
      htmlAttrs: { lang: 'en' },
      link: [
        // Order matters and is the opposite of what reads naturally: Chrome
        // and Firefox pick the *last* icon link they can use, so the `.ico`
        // goes first and the SVG second. Put the SVG first and Chrome quietly
        // serves the `.ico` forever. Browsers with no SVG favicon support
        // skip the second entry and fall back to the first.
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico', sizes: '32x32' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        // iOS never reads the manifest's `icons` array for the home screen —
        // this link is the only thing it looks at.
        {
          rel: 'apple-touch-icon',
          sizes: '180x180',
          href: '/icons/apple-touch-icon-180x180.png'
        }
      ],
      meta: [
        // Two entries so the Android status bar and desktop title bar follow
        // the active theme rather than being pinned to one of them.
        { name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#fafafb' },
        { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#07090d' },
        // The manifest covers standalone display everywhere else, but Safari
        // still only honours these meta tags.
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'Streamify' },
        // `black`, not `black-translucent`: the translucent variant pulls the
        // page up under the status bar, which needs safe-area padding that the
        // layouts don't currently apply.
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }
      ]
    }
  },
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
  modules: [
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/eslint',
    '@nuxtjs/color-mode',
    // `@nuxtjs/pwa` (pwa.nuxtjs.org) is Nuxt 2 only — its registry entry
    // declares `compatibility: ^2.0.0` and it targets the Nuxt 2 module API.
    // `@vite-pwa/nuxt` is the maintained Nuxt 3/4 equivalent. See ADR-022.
    '@vite-pwa/nuxt'
  ],
  // classSuffix: '' → applies a bare `.dark` / `.light` class on <html>, which is
  // what main.css's `.dark { ... }` block and the `dark:` variant expect.
  colorMode: { classSuffix: '', preference: 'dark', fallback: 'dark' },
  // components/ui/* follows shadcn-vue's convention: imported explicitly via
  // its index.ts barrel, not auto-registered (its own index.ts otherwise
  // collides with the auto-registered component name — NUXT_B3011).
  components: [{ path: '~/components', pathPrefix: false, ignore: ['ui/**'] }],
  pwa: {
    // Ship an update on the next load instead of waiting for every tab to
    // close. A streaming app is left open for hours; `prompt` would leave
    // people on a stale bundle for most of a session.
    registerType: 'autoUpdate',
    // In production Nitro serves the app, not Vite — without this route rule
    // `/manifest.webmanifest` 404s outside dev and nothing is installable.
    registerWebManifestInRouteRules: true,
    manifest: {
      id: '/',
      name: 'Streamify — live streams, clips & shorts',
      short_name: 'Streamify',
      description:
        'Watch live streams, clips and shorts, follow your favourite channels, and go live yourself.',
      lang: 'en',
      dir: 'ltr',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      // Video is watched both ways up — pinning orientation here would fight
      // fullscreen landscape playback.
      orientation: 'any',
      background_color: '#07090d',
      theme_color: '#07090d',
      categories: ['entertainment', 'video', 'social'],
      icons: [
        { src: '/icons/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
        // 192 and 512 `any` icons are what Chrome's installability check
        // requires; dropping either one silently disables the install prompt.
        { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        // Separate file rather than a `purpose: 'any maskable'` on the one
        // above: a maskable icon gets cropped to the platform's shape, so it
        // needs its own wider safe zone (see `pwa-icon-maskable.svg`).
        {
          src: '/icons/maskable-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ],
      // Long-press / right-click the installed icon. No per-shortcut icons:
      // platforms fall back to the app icon, which beats inventing artwork.
      shortcuts: [
        { name: 'Shorts', url: '/shorts' },
        { name: 'Following', url: '/following' },
        { name: 'Trending', url: '/trending' },
        { name: 'Go live', url: '/stream' }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      cleanupOutdatedCaches: true,
      // `navigateFallback` is deliberately unset. This app is server-rendered,
      // and generateSW's navigation route would serve one precached shell for
      // *every* navigation — replacing real SSR pages with a static one and
      // breaking auth-gated routes. Navigations go to the network; only build
      // assets are precached.
      runtimeCaching: [
        // `assets/css/main.css` pulls Inter from Google Fonts, so the font is
        // on the critical path. Cache it or every cold load blocks on it.
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'google-fonts-stylesheets' }
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-webfonts',
            expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            // Font files come back as opaque cross-origin responses (status 0).
            cacheableResponse: { statuses: [0, 200] }
          }
        }
      ]
    },
    client: {
      // Surfaces `beforeinstallprompt` through `usedPWA()` so the app can offer
      // install in its own UI instead of relying on the browser's affordance.
      installPrompt: true
    },
    devOptions: {
      // Off by default: a service worker in front of HMR turns every edit into
      // a cache-invalidation puzzle. Opt in with `NUXT_PWA_DEV=true npm run dev`
      // when you specifically need to test install or update behaviour.
      enabled: process.env.NUXT_PWA_DEV === 'true',
      type: 'module',
      suppressWarnings: true
    }
  },
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
