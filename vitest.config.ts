import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'happy-dom',
    // `server/db/client.ts` fails fast when DATABASE_URL is unset, so a missing
    // `.env` names itself instead of surfacing later as a driver error. Several
    // specs (`server/utils/notifications`, `server/utils/subscriptions`) import
    // server utils that transitively pull in that client, but never run a query
    // — postgres.js only opens a socket on the first one. A syntactically valid
    // dummy keeps those imports working without pointing the suite at a real
    // database. This is not new behaviour, only newly explicit: the client's
    // previous `?? ''` fallback did the same thing silently.
    env: { DATABASE_URL: 'postgresql://vitest:vitest@127.0.0.1:5432/vitest' },
    // `.claude/worktrees/` holds throwaway git worktrees from agent sessions —
    // each a full checkout with its own `node_modules`. Vitest doesn't read
    // git excludes, so without this it collects their specs too (192 files
    // against 56 real ones) and runs them through a second copy of Vue, which
    // fails on contact. See `git worktree list`.
    exclude: ['**/node_modules/**', '**/e2e/**', '**/.claude/**']
  }
})
