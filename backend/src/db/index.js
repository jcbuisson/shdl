import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema.js'

export function createDB(connectionString) {
   const client = new pg.Pool({ connectionString })
   return drizzle(client, { schema })
}
