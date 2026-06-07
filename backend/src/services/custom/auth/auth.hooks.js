import { eq, and } from 'drizzle-orm'

import config from '#config'
import { protect } from '#root/src/common-server.mjs'
import { extendExpiration, checkExpiration } from '#root/src/hooks.mjs'
import * as schema from '#root/src/db/schema.js'


async function afterSignin(context) {
   context.socket.data.user = Object.assign({}, context.result)
   const now = new Date()
   context.socket.data.expiresAt = new Date(now.getTime() + config.SESSION_EXPIRE_DELAY)
   console.log('socket.data.expiresAt set by afterSignin', context.socket.data.expiresAt)
   const db = context.app.get('db')
   const followupRelations = await db.select().from(schema.user_tab_relation)
      .where(and(
         eq(schema.user_tab_relation.user_uid, context.socket.data.user.uid),
         eq(schema.user_tab_relation.tab, 'followup')
      ))
   const isTeacher = (followupRelations.length > 0)
   if (isTeacher) {
      context.app.joinChannel('teachers', context.socket)
   } else {
      context.app.joinChannel(context.socket.data.user.uid, context.socket)
      context.app.joinChannel('students', context.socket)
   }
   console.log('socket.rooms', context.socket.rooms)
   context.result = {
      user: context.socket.data.user,
      expiresAt: context.socket.data.expiresAt
   }
}

function afterSignout(context) {
   context.socket.data = {}
   const rooms = new Set(context.socket.rooms)
   for (const room of rooms) {
      if (room === context.socket.id) continue
      context.socket.leave(room)
   }
}

export default {
   before: {
      extendExpiration: [extendExpiration(config.SESSION_EXPIRE_DELAY)],
      ping: [checkExpiration],
   },
   after: {
      signin: [afterSignin, protect('password')],
      signout: [afterSignout],
      createAccountWithToken: [protect('password')],
   },
}
