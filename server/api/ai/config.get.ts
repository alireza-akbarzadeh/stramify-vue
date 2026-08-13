import { geminiSettings } from '../../utils/gemini'
import type { AiConfig } from '#shared/types/ai'

/**
 * Whether the AI assistant is usable, and on which model.
 *
 * A route rather than `runtimeConfig.public` because `public` values are baked
 * at build time unless a `NUXT_PUBLIC_*` override is set, and "is there a key
 * on this server" is a runtime fact — an image built without one and deployed
 * with one would otherwise ship a panel permanently switched off.
 *
 * The key itself never appears here. Only the model id (a public string, shown
 * in the panel footer) and the derived billing tier.
 */
export default defineEventHandler((event): AiConfig => {
  const settings = geminiSettings(event)

  // Cheap and stable for the life of the process — the client caches it
  // forever, and this stops a hard refresh on every watch page re-asking.
  setResponseHeader(event, 'Cache-Control', 'public, max-age=300')

  return settings
    ? { enabled: true, model: settings.model, tier: settings.tier }
    : { enabled: false, model: '', tier: 'free' }
})
