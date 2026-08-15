// Auth layer — sign-in, sign-up, password recovery, email verification, and
// the two account-security pages (password change, 2FA enrolment).
//
// What deliberately stays at the root, because the whole app depends on it:
//   - `app/stores/auth.ts`      (46 import sites)
//   - `app/lib/auth-client.ts`  (better-auth browser client, 10 sites)
//   - `app/middleware/auth.ts`  (route guard used by pages in every domain)
//   - `server/utils/session.ts` (`requireUser`, used by every write endpoint)
// Only the sign-in *surface* lives here. Moving the store or the guard would
// invert the dependency and make every protected page in the app depend on
// this layer.
//
// This layer needed no import rewrites at all: its pages and components only
// reach for `@/lib/auth-client`, `@/components/ui/*` and `@/stores/auth`, and
// those aliases resolve against the root project from inside a layer.
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const currentDir = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
  $meta: {
    name: 'auth'
  },
  // Required — see ADR-032. A layer does not inherit the root's
  // `pathPrefix: false`, so without this `auth/AuthAlert.vue` registers as
  // `<AuthAuthAlert>` and every template using it breaks at render time.
  components: [{ path: join(currentDir, 'app/components'), pathPrefix: false }]
})
