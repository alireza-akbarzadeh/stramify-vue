# PWA (installability, app icons, service worker)

Makes Streamify installable — home-screen/dock icon, standalone window,
splash screen, precached build assets. **Offline is deliberately partial**:
build assets and Google Fonts are cached, navigations are not. See "What
this does *not* do" below before assuming otherwise.

## What it is

[`@vite-pwa/nuxt`](https://vite-pwa-org.netlify.app/frameworks/nuxt) v1 —
the Vite PWA org's Nuxt 3/4 module, wrapping `vite-plugin-pwa` and
Workbox's `generateSW`. All configuration lives in one `pwa` block in
[nuxt.config.ts](../nuxt.config.ts); there is no worker source in this
repo.

> **Not `@nuxtjs/pwa`.** The module at pwa.nuxtjs.org is Nuxt 2 only — its
> registry entry declares `compatibility: "^2.0.0"` and it targets the
> Nuxt 2 module API. Installing it here fails to load rather than degrading.
> [DECISIONS.md](./DECISIONS.md) ADR-022 has the full reasoning for every
> choice on this page.

## How it works

- **Manifest**: generated from `pwa.manifest` in `nuxt.config.ts` and served
  at `/manifest.webmanifest`. `registerWebManifestInRouteRules: true`
  registers it as a Nitro route rule — required, because in production
  Nitro serves the app and Vite is not in the request path.
- **Service worker**: Workbox `generateSW` emits `sw.js` at the site root at
  build time. It precaches the glob in `pwa.workbox.globPatterns` (JS, CSS,
  HTML, SVG, PNG, ICO, WOFF2) and adds two runtime caches for Google Fonts,
  which `assets/css/main.css` `@import`s. `registerType: 'autoUpdate'` means
  a new worker takes over on the next load instead of waiting for every tab
  to close.
- **Registration**: the module's own client plugin registers the worker
  (`pwa.client.registerPlugin`, on by default). `client.installPrompt: true`
  additionally captures `beforeinstallprompt`, so the app *can* offer an
  in-UI install button via the auto-imported `useNuxtApp().$pwa` — nothing
  currently does; see "Not built yet".
- **Head tags**: `app.head` in `nuxt.config.ts` carries what the manifest
  can't — dual `theme-color` (light/dark), the `apple-touch-icon` link, and
  the `apple-mobile-web-app-*` tags Safari reads instead of the manifest.

### Icons

Sources are three hand-authored SVGs in `app/assets/icons/`. Rasterised to
`public/icons/*.png` by:

```bash
npm run icons:pwa
```

(`scripts/generate-pwa-icons.mjs`, `sharp`, rendered at ~5× then
downsampled). **Edit the SVGs, never the PNGs** — the next run overwrites
them. Output is committed, because Nitro serves `public/` verbatim and the
manifest has to resolve at request time.

Three sources rather than one resize, because the three consumers crop
differently:

| Source | Output | Why it's separate |
| --- | --- | --- |
| `pwa-icon.svg` | `pwa-64x64`, `pwa-192x192`, `pwa-512x512` | `purpose: "any"` is drawn as authored, so it carries its own rounded tile |
| `pwa-icon-maskable.svg` | `maskable-512x512` | Cropped to the platform's shape — full-bleed, glyph scaled to 72% to sit inside the 80%-diameter safe zone |
| `pwa-icon-apple.svg` | `apple-touch-icon-180x180` | iOS composites alpha onto black and applies its own squircle, so: opaque, no authored corners |

`public/favicon.svg` is hand-authored separately and **not** generated: it
drops the film-strip perforations, which turn into grey smudges below
~32px — the only size a favicon is ever seen at. `public/favicon.ico`
remains as the fallback for browsers that ignore SVG favicons.

The mark itself is a rose-gradient tile (tracking `--primary: #ff335f` from
`app/assets/css/main.css`) with film-strip perforations and a play glyph.

## How to run / modify it

- **Dev**: the worker is **off** by default — a service worker in front of
  HMR turns every edit into a cache-invalidation puzzle. Opt in when you
  need to test install or update behaviour:

  ```bash
  NUXT_PWA_DEV=true npm run dev
  ```

- **Verify a real build** (dev mode does not exercise `generateSW`):

  ```bash
  npm run build && npm run preview
  ```

  Then in devtools → Application: Manifest (no errors, icons resolve),
  Service Workers (`sw.js` activated), Cache Storage (a `workbox-precache`
  entry). Chrome's install affordance appears in the address bar.
- **Change the app name, colours, shortcuts**: `pwa.manifest` in
  `nuxt.config.ts`. `theme_color` and `background_color` are the dark-theme
  tokens (`#07090d`), matching `colorMode`'s `preference: 'dark'`.
- **Change what's precached**: `pwa.workbox.globPatterns`. Adding runtime
  caches for API routes is the wrong move — see below.

## What this does *not* do (yet)

- **No offline page.** `workbox.navigateFallback` is deliberately unset.
  `generateSW`'s navigation route is all-or-nothing: setting a fallback
  makes *every* navigation answer from one precached HTML shell, which on
  this SSR app silently replaces server-rendered and auth-gated pages with
  a static document. An uncached navigation while offline therefore shows
  the browser's error page. A real offline fallback needs
  `strategies: 'injectManifest'` and a hand-written worker using
  `setCatchHandler` — deferred, not forgotten.
- **No API caching.** Nothing under `/api` is cached at runtime. Session,
  feeds, chat and viewer counts are all request-scoped; a stale auth
  response is a correctness bug, not a perf win.
- **No install UI.** `client.installPrompt` captures the event, but no
  component consumes `$pwa.showInstallPrompt` yet, so install happens
  through the browser's own affordance.
- **No manifest `screenshots`.** Android shows the compact install dialog
  rather than the rich one until real captures exist. Omitted rather than
  faked.

## Common failure modes

- **`/manifest.webmanifest` 404s in production, works in dev.**
  `registerWebManifestInRouteRules` got turned off. In dev Vite serves the
  manifest directly; in production only the Nitro route rule does.
- **Install prompt never appears.** Chrome requires HTTPS (localhost is
  exempt), a registered worker with a fetch handler, and *both* a 192×192
  and a 512×512 `purpose: "any"` icon. Dropping either icon disables the
  prompt with no error — check devtools → Application → Manifest.
- **Home-screen icon has black corners on iOS.** Something reintroduced
  alpha into `apple-touch-icon-180x180.png`. It must stay opaque and
  full-bleed; `generate-pwa-icons.mjs` flattens it for exactly this reason.
- **Android icon looks shrunken inside a second circle.** The maskable icon
  is being generated from `pwa-icon.svg` (which has its own tile) instead of
  `pwa-icon-maskable.svg`, so the platform mask rounds an already-rounded
  tile.
- **Edits don't show up after a build.** `registerType: 'autoUpdate'` still
  needs one reload to swap workers. Hard-reload, or unregister under
  devtools → Application → Service Workers.
- **A worker is active in dev when you didn't ask for one.** Either
  `NUXT_PWA_DEV=true` is still exported in the shell, or the browser is
  holding a registration from a previous production `npm run preview` on the
  same origin. Unregister it in devtools.

> `public/sw.js` used to hold a self-destructing worker that cleared a stale
> registration left on `localhost:3000` by an unrelated project. It was
> deleted when this module landed — `vite-plugin-pwa` emits its own `sw.js`
> at the site root and a file in `public/` would shadow it. Browsers still
> holding the old registration get the real worker on next load.
