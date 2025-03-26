
import { EXError } from '#root/src/common-server.mjs'


// If authenticated, do nothing
// If not, throws 'not-authenticated' exception (blocks service calls when used as 'before' hook)
export const isAuthenticated = async (context) => {
   // do nothing if it's not a client call from a ws connexion
   if (!context.socket) return
   const expiresAt = context.socket?.data?.expiresAt
   if (expiresAt) {
      const expiresAtDate = new Date(expiresAt)
      const now = new Date()
      if (now > expiresAtDate) {
         // expiration date is met
         // clear socket.data
         context.socket.data = {}
         // leave all rooms except socket#id
         const rooms = new Set(context.socket.rooms)
         for (const room of rooms) {
            if (room === context.socket.id) continue
            context.socket.leave(room)
         }
         // throw exception (blocks service calls when used as 'before' hook)
         throw new EXError('not-authenticated', "Session expired")
      }
   } else {
      // throw exception (blocks service calls when used as 'before' hook)
      throw new EXError('not-authenticated', "No expiresAt in socket.data")
   }
}


// If authenticated and not expired, extend expiration date (attached to socket.data) of `duration`
// Send an event 'expiresAt' to client socket with the new expiration date or null
export const extendExpiration = (duration) => async (context) => {
   // do nothing if it's not a client call from a ws connexion
   if (!context.socket) return
   const expiresAt = context.socket?.data?.expiresAt
   if (expiresAt) {
      const expiresAtDate = new Date(expiresAt)
      const now = new Date()
      if (now > expiresAtDate) {
         // expiration date is met
         // clear socket.data
         context.socket.data = {}
         // leave all rooms except socket#id
         const rooms = new Set(context.socket.rooms)
         for (const room of rooms) {
            if (room === context.socket.id) continue
            context.socket.leave(room)
         }
         // send an event to the client socket
         context.socket.emit('expiresAt', null)
      } else {
         // extend expiration
         const expiresAt = new Date(now.getTime() + duration)
         context.socket.data.expiresAt = expiresAt
         // send an event to the client socket
         context.socket.emit('expiresAt', expiresAt)
      }
   } else {
      // send an event to the client socket
      context.socket.emit('expiresAt', null)
   }
}

export const checkExpiration = async (context) => {
   // do nothing if it's not a client call from a ws connexion
   if (!context.socket) return
   const expiresAt = context.socket?.data?.expiresAt
   if (expiresAt) {
      const expiresAtDate = new Date(expiresAt)
      const now = new Date()
      if (now > expiresAtDate) {
         // expiration date is met
         // clear socket.data
         context.socket.data = {}
         // leave all rooms except socket#id
         const rooms = new Set(context.socket.rooms)
         for (const room of rooms) {
            if (room === context.socket.id) continue
            context.socket.leave(room)
         }
         // send an event to the client socket
         context.socket.emit('expiresAt', null)
      }
   } else {
      // send an event to the client socket
      context.socket.emit('expiresAt', null)
   }
}
