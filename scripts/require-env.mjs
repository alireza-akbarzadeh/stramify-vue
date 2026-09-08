/**
 * Read a required environment variable, or fail naming it.
 *
 * This mirrors `server/utils/env.ts` on purpose. The seed scripts are plain
 * `.mjs` run directly by `node --env-file=.env`, so they cannot import the
 * TypeScript one — the duplication is a runtime boundary, not an oversight.
 * Keep the two messages identical so the failure reads the same wherever it
 * comes from.
 */
export function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`)
  }
  return value
}
