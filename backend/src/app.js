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
const pgDB = new Pool({ connectionString: process.env.DATABASE_URL })

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
   electricUrl: process.env.ELECTRIC_URL ?? 'http://localhost:3002/v1/shape',
   authorize: async (context, { action }) => (
      action === 'shape' || Boolean(context.socket?.data?.user)
   ),
})

app.configure(services)

// development only: serve static assets (reports, avatars)
app.use('/static', express.static('./static'))

app.configure(channels)

app.configure(reloadPlugin)

app.httpServer.listen(config.PORT, () => console.log(`App listening at http://localhost:${config.PORT}`))
