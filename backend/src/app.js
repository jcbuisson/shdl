import express from 'express'
import { expressX, reloadPlugin } from '@jcbuisson/express-x'

import config from '#config'
import { createDB } from './db/index.js'
import services from './services/index.js'
import channels from './channels.js'


const app = expressX(config)

const db = createDB(config.DATABASE_URL)
app.set('db', db)

app.configure(services)

// development only: serve static assets (reports, avatars)
app.use('/static', express.static('./static'))

app.configure(channels)

app.configure(reloadPlugin)

app.httpServer.listen(config.PORT, () => console.log(`App listening at http://localhost:${config.PORT}`))
