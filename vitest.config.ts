import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'happy-dom',
    // `.claude/worktrees/` holds throwaway git worktrees from agent sessions —
    // each a full checkout with its own `node_modules`. Vitest doesn't read
    // git excludes, so without this it collects their specs too (192 files
    // against 56 real ones) and runs them through a second copy of Vue, which
    // fails on contact. See `git worktree list`.
    exclude: ['**/node_modules/**', '**/e2e/**', '**/.claude/**']
  }
})
