// Marketing layer — the public, logged-out company surface: the product
// landing page (`/marketing`) plus About / Careers / Security.
//
// Nothing outside this layer may depend on it. Two components that used to
// live in `components/landing/` were promoted to the root `app/components/`
// when this layer was extracted, because the app proper consumes them:
// `LiveBadge` (10 consumers across home, discovery, watch, channel,
// following, search) and `PricingCard` (billing). Keeping them here would
// have made half the app depend on the marketing layer.
//
// Aliases: `~/` and `@/` inside a layer resolve against the *root project*,
// not this directory (see Nuxt's Layer Author Guide, "Relative Paths and
// Aliases"). That is why the components below can still import
// `@/lib/utils`, `@/components/ui/button` and `#shared/types/billing`
// without any rewriting — those all live at the repo root and stay there.
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const currentDir = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
  $meta: {
    name: 'marketing'
  },
  // The root `nuxt.config.ts` sets `pathPrefix: false`, but that applies to
  // the root's own `app/components` scan — it does NOT carry into a layer.
  // Without this block Nuxt falls back to its default `pathPrefix: true` and
  // registers `landing/GlassPanel.vue` as `<LandingGlassPanel>`, so every
  // `<GlassPanel>` / `<BentoCard>` / `<TrustedBy>` in these templates stops
  // resolving. Verified against `.nuxt/components.d.ts`, not assumed.
  //
  // The path must be absolute: relative paths in a *layer's* nuxt.config are
  // resolved against the consuming project, not this directory (Nuxt Layer
  // Author Guide, "Relative Paths and Aliases"). `./app/components` would
  // silently point at the repo root's components instead.
  components: [{ path: join(currentDir, 'app/components'), pathPrefix: false }]
})
