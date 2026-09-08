import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { requireEnv } from '../utils/env'
import * as schema from './schema'

/**
 * Connection is lazy — postgres.js only opens a socket on the first query,
 * so booting the app without a reachable database (e.g. local dev before
 * `docker compose up`) doesn't crash the server, only queries that run.
 *
 * `requireEnv` does not change that: it asserts the variable is *set*, not
 * that the database answers. The previous `?? ''` handed postgres.js an empty
 * connection string, which failed later and less clearly — at the first query,
 * as a parse or connection error, rather than at boot as "DATABASE_URL is not
 * set".
 */
const queryClient = postgres(requireEnv('DATABASE_URL'), { max: 10 })

export const db = drizzle(queryClient, { schema })
