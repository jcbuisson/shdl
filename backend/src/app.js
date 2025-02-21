import express from 'express'
import { expressX } from '@jcbuisson/express-x'
import { PrismaClient } from '@prisma/client'

import config from '#config'
import services from './services/index.js'
import channels from './channels.js'
import transfer from './transfer.js'


const app = expressX(config)

const prisma = new PrismaClient()
app.set('prisma', prisma)

// logging
// app.configure(logging)

// services
app.configure(services)

// development only: serve static assets (reports, avatars)
app.use('/static', express.static('./static'))

// pub/sub
app.configure(channels)

// cnx transfer
app.configure(transfer)

app.httpServer.listen(config.PORT, () => console.log(`App listening at http://localhost:${config.PORT}`))
