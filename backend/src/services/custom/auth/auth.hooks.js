
import config from '#config'

import { extendExpiration, protect } from '#root/src/common-server.mjs'


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

function afterCheckAuthentication(context) {
   if (context.socket?.data?.expiresAt) {
      const expiresAtDate = new Date(context.socket.data.expiresAt)
      const now = new Date()
      if (now > expiresAtDate) {
         context.result = null
      } else {
         context.result = context.socket.data.user
      }
   } else {
      context.result = null
   }
}

export default {
   after: {
      signin: [afterSignin],
      signout: [afterSignout],
      checkAndExtend: [extendExpiration(config.SESSION_EXPIRE_DELAY)],
      checkAuthentication: [afterCheckAuthentication, protect('password')],
   },
}
