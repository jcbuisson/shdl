
// COMMON TO NUTRIEDUC & INFIRMIER

import config from '#config'

import { extendExpiration } from '#root/src/common-server.mjs'


async function afterAuthentication(context) {
   // set socket.data.user
   context.socket.data.user = Object.assign({}, context.result)
   console.log('socket.data.user set by afterAuthentication')
   // set socket.data.expiresAt
   const now = new Date()
   context.socket.data.expiresAt = new Date(now.getTime() + config.SESSION_EXPIRE_DELAY)
   console.log('socket.data.expiresAt set by afterAuthentication', context.socket.data.expiresAt)
   // add socket to "authenticated" channel
   context.app.joinChannel('authenticated', context.socket)
   // remove password field from result
   delete context.result.password
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
   after: {
      localSignin: [afterAuthentication, extendExpiration(config.SESSION_EXPIRE_DELAY)],
      localSignup: [afterAuthentication, extendExpiration(config.SESSION_EXPIRE_DELAY)],
      logout: [afterSignout],
      checkAndExtend: [extendExpiration(config.SESSION_EXPIRE_DELAY)],
   },
}
