import { createAuthClient } from 'better-auth/vue'
import { twoFactorClient } from 'better-auth/client/plugins'
import { polarClient } from '@polar-sh/better-auth/client'

// No baseURL — defaults to same-origin, correct for both dev and prod.
//
// `polarClient()` adds `authClient.checkout(...)` and the `authClient.customer.*`
// methods (ADR-026). It's registered unconditionally even though the server may
// have billing disabled: the methods are thin wrappers over endpoints that
// simply won't exist in that case, and gating the client plugin on server config
// would mean shipping the deployment's billing state into the bundle.
export const authClient = createAuthClient({
  plugins: [twoFactorClient(), polarClient()]
})
