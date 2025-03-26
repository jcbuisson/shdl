
import config from '#config'

import { protect } from '#root/src/common-server.mjs'
import { extendExpiration, checkExpiration } from '#root/src/hooks.mjs'


async function afterSignin(context) {
   // set socket.data.user
   context.socket.data.user = Object.assign({}, context.result)
   console.log('socket.data.user set by afterAuthentication')
   // set socket.data.expiresAt
   const now = new Date()
   context.socket.data.expiresAt = new Date(now.getTime() + config.SESSION_EXPIRE_DELAY)
   console.log('socket.data.expiresAt set by afterAuthentication', context.socket.data.expiresAt)
   // add socket to "authenticated" channel
   context.app.joinChannel('authenticated', context.socket)
   context.result = {
      user: context.socket.data.user,
      expiresAt: context.socket.data.expiresAt
   }
}

function afterSignout(context) {
   // clear connection data
   context.socket.data = {}
   // leave all rooms except socket#id
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
