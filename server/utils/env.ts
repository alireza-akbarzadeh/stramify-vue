/**
 * Read a required environment variable, or fail naming it.
 *
 * The call sites this replaces all wrote `process.env.X ?? ''`, which turns a
 * missing variable into a valid-looking empty value and defers the failure to
 * whatever consumes it. `pnpm db:studio` with no `.env` reported
 * "Please provide required params for Postgres driver: [x] url: ''" — true,
 * but it describes the symptom two layers below the cause and sends you
 * reading drizzle's config schema instead of looking for a missing file.
 *
 * There is a near-identical copy at `scripts/require-env.mjs`. That is
 * deliberate, not an oversight: the seed scripts are plain `.mjs` run directly
 * by `node`, so they cannot import this TypeScript module.
 */
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`)
  }
  return value
}
