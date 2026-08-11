import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL, { max: 1 })
const rows = await sql`select count(*)::int as n from drizzle.__drizzle_migrations`
const tables = await sql`
  select table_name from information_schema.tables
  where table_schema = 'public' order by table_name
`
console.log('current_database:', (await sql`select current_database() as d`)[0].d)
console.log('applied:', rows[0].n)
console.log('tables:', tables.map((t) => t.table_name).join(', '))
await sql.end()
