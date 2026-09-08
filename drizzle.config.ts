import { defineConfig } from 'drizzle-kit'

/*
 * Checked inline rather than via `server/utils/env.ts` so this root-level
 * config stays self-contained — drizzle-kit runs it through its own tsx
 * loader, and a reach into the Nitro server tree is one more thing that can
 * resolve differently there than under Nuxt.
 *
 * drizzle-kit loads `.env` itself (it bundles dotenv and side-effect imports
 * `dotenv/config`, resolving `<cwd>/.env`), so this is not a missing read —
 * by the time it runs, the file has been loaded or does not exist. The old
 * `?? ''` turned that second case into `url: ''`, and drizzle then reported
 * "Please provide required params for Postgres driver: [x] url: ''", which
 * sends you reading drizzle's config schema instead of looking for `.env`.
 */
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.')
}

export default defineConfig({
  schema: './server/db/schema/index.ts',
  out: './server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl
  }
})
