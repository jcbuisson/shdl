import { io } from 'socket.io-client'

// Node-only client for the current Express-X acknowledgement protocol.
// The browser client also imports Vue utilities, which the CLI does not need.
export function createServerClient(socket, timeout = 20000) {
   return {
      service(name) {
         return new Proxy({}, {
            get(_target, action) {
               if (action === 'then' || typeof action !== 'string') return undefined
               return async (...args) => {
                  const { error, result } = await socket.timeout(timeout)
                     .emitWithAck('client-request', { name, action, args })
                  if (error) {
                     throw Object.assign(new Error(error.message || error.code || 'Server request failed'), error)
                  }
                  return result
               }
            },
         })
      },
      disconnect: () => socket.disconnect(),
   }
}

export async function connectToServer(server, timeout = 20000) {
   const socket = io(server, {
      path: '/shdl-socket-io/',
      transports: ['websocket'],
      autoConnect: false,
      reconnection: false,
      timeout,
   })
   try {
      await new Promise((resolve, reject) => {
         socket.once('connect', resolve)
         socket.once('connect_error', reject)
         socket.connect()
      })
      return createServerClient(socket, timeout)
   } catch (error) {
      socket.disconnect()
      throw error
   }
}
