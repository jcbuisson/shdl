import express from 'express'
import pg from 'pg'

import { expressX } from '@jcbuisson/express-x/server'
import { reloadPlugin } from '@jcbuisson/express-x-plugins/reload-server'
import { electricServerPlugin } from '@jcbuisson/express-x-plugins/electric-server'

import config from '#config'
import { createDB } from './db/index.js'
import { prepareSHDLSyncSchema } from './db/electricSync.js'
import services from './services/index.js'
import channels from './channels.js'


const app = expressX(config)

const db = createDB(config.DATABASE_URL)
app.set('db', db)

const { Pool } = pg
const pgDB = new Pool({ connectionString: config.DATABASE_URL })

// dev only?
app.use('/electric/v1', (_request, response, next) => {
   response.setHeader('Access-Control-Allow-Origin', '*')
   response.setHeader(
      'Access-Control-Expose-Headers',
      'electric-offset, electric-handle, electric-schema, electric-cursor',
   )
   next()
})

// Complete the idempotent migration before accepting requests.
const migrationClient = await pgDB.connect()
let electricModels
try {
   await migrationClient.query('BEGIN')
   electricModels = await prepareSHDLSyncSchema(migrationClient)
   await migrationClient.query('COMMIT')
} catch (error) {
   await migrationClient.query('ROLLBACK')
   throw error
} finally {
   migrationClient.release()
}

app.configure(electricServerPlugin, pgDB, electricModels, {
   sync: true,
   electricUrl: config.ELECTRIC_URL,
   authorize: async (context, { action }) => (
      action === 'shape' || Boolean(context.socket?.data?.user)
   ),
})

app.configure(services)

// development only: serve static assets (reports, avatars)
app.use('/static', express.static('./static'))

app.configure(channels)

app.configure(reloadPlugin, {
   // The reload plugin validates the previous socket's one-time transfer token
   // before attempting to restore any cached rooms.
   authorizeRoomRestore: async () => true,
})

app.httpServer.listen(config.PORT, () => console.log(`App listening at http://localhost:${config.PORT}`))
