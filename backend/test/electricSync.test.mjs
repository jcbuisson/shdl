import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { user } from '../src/db/schema.js'
import { electricServerPlugin } from '@jcbuisson/express-x-plugins/electric-server'
import { prepareSHDLSyncSchema, requiredFields } from '../src/db/electricSync.js'

const admin = new pg.Client({ connectionString: process.env.DATABASE_URL })
await admin.connect()
const schema = 'shdl_sync_test_' + randomUUID().replaceAll('-', '')
let pool
try {
   await admin.query('CREATE SCHEMA "' + schema + '"')
   for (const name of Object.keys(requiredFields)) {
      await admin.query(`CREATE TABLE "${schema}"."${name}" (LIKE public."${name}" INCLUDING ALL)`)
   }
   pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, options: '-c search_path=' + schema })
   const models = await prepareSHDLSyncSchema(pool)
   await prepareSHDLSyncSchema(pool) // repeatable migration
   // LIKE copies sequence defaults from public; isolate them for this test.
   for (const { name } of models) {
      await pool.query(`ALTER TABLE "${name}" ALTER COLUMN version SET DEFAULT nextval('electric_sync_version_seq')`)
   }
   const services = new Map()
   electricServerPlugin({ createService: (name, methods) => services.set(name, methods), get() {} }, pool, models, { sync: true })
   const clientId = randomUUID()
   let revision = 0
   const meta = () => ({ clientId, revision: String(++revision) })
   for (const { name } of models) {
      const service = services.get(name)
      const uid = randomUUID()
      const data = Object.fromEntries(requiredFields[name].map(field => [field,
         field === 'start' || field === 'end' ? '2026-09-29T12:00:00Z' :
         field === 'weight' || field === 'update_count' ? 1 :
         field === 'tab' ? 'workshop' : randomUUID(),
      ]))
      const createMeta = meta()
      const created = await service.create(uid, data, createMeta)
      assert.equal(created.uid, uid)
      assert.equal(created.deleted, false)
      const replay = await service.create(uid, data, createMeta)
      assert.equal(String(replay.version), String(created.version))
      const patch = { [requiredFields[name][0]]: data[requiredFields[name][0]] }
      const updated = await service.update(uid, patch, meta())
      assert(BigInt(updated.version) > BigInt(created.version))
      const deleted = await service.delete(uid, meta())
      assert.equal(deleted.deleted, true)
      assert(BigInt(deleted.version) > BigInt(updated.version))
      for (const field of requiredFields[name]) assert.equal(deleted[field], null)
      const recreated = await service.create(randomUUID(), data, meta())
      assert.equal(recreated.deleted, false)
      const missingDelete = await service.delete(randomUUID(), meta())
      assert.equal(missingDelete.deleted, true)
      console.log(name + ': create, replay, update, tombstone, recreate passed')
   }
   // Direct server-side writes must also advance versions.
   const { rows: [before] } = await pool.query('SELECT * FROM "user" WHERE NOT deleted LIMIT 1')
   const { rows: [after] } = await pool.query('UPDATE "user" SET password = $1 WHERE uid = $2 RETURNING *', ['changed', before.uid])
   assert(BigInt(after.version) > BigInt(before.version))
   const users = await drizzle(pool).select().from(user)
   assert.equal(typeof users[0].version, 'string')
   assert.doesNotThrow(() => JSON.stringify(users))
   await assert.rejects(pool.query('INSERT INTO "group" (uid) VALUES ($1)', [randomUUID()]))
   console.log('Direct-write versioning and live-row constraints passed.')
} finally {
   await pool?.end()
   await admin.query('DROP SCHEMA "' + schema + '" CASCADE')
   await admin.end()
}
