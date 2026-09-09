import { ref } from 'vue'

/**
 * Stand-in for `virtual:pwa-register/vue` under Vitest.
 *
 * `@vite-pwa/nuxt` injects a plugin that imports that virtual module. The test
 * runner prefixes the resolved virtual id with `file://`, and Node's
 * `fileURLToPath` rejects it:
 *
 *   TypeError: The argument 'filename' must be a file URL object, file URL
 *   string, or absolute path string. Received
 *   'file:///@vite-plugin-pwa/virtual:pwa-register/vue'
 *
 * That single unhandled error took down 33 of 66 test files before any of them
 * ran. Setting `pwa.disable` in `nuxt.config.ts` does not help — `process.env.
 * VITEST` is not set at the point the Nuxt config is evaluated — so the module
 * is intercepted here instead, via `resolve.alias` in `vitest.config.ts`.
 *
 * Kept deliberately inert: no app code calls `useRegisterSW`, so this only has
 * to satisfy the injected plugin's import. If a component ever does start
 * driving update prompts from it, this stub needs to grow accordingly.
 */
export function useRegisterSW() {
  return {
    needRefresh: ref(false),
    offlineReady: ref(false),
    updateServiceWorker: async () => {}
  }
}
