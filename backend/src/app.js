import express from 'express'
import pg from 'pg'

import { expressX } from '@jcbuisson/express-x/server'
import { reloadPlugin } from '@jcbuisson/express-x-plugins/reload-server'
import { electricOfflinePlugin } from '@jcbuisson/express-x-plugins/electric-server'

import config from '#config'
import { createDB } from './db/index.js'
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

app.configure(electricOfflinePlugin, pgDB, [
   'user',
   'group',
   'group_slot',
   'user_tab_relation',
   'user_group_relation',
   'user_document',
   'user_document_event',
   'user_slot_excuse',
   'test',
   'groupslot_test_relation',
   'user_test_relation',
], {
   // ElectricSQL sync service
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
