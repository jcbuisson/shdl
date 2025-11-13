import { ref } from 'vue';
import { io, Socket } from "socket.io-client";
import expressXClient from "@jcbuisson/express-x-client";
import { useSessionStorage } from '@vueuse/core'

import { setExpiresAt } from "/src/use/useAppState"
import { useAuthentication } from "/src/use/useAuthentication"


// connection socket & dates are common to all instances of useExpressXClient()
let socket: Socket | null = null;
const connectedDate = ref()
const disconnectedDate = ref()

const socketOptions = {
   path: '/shdl-socket-io/',
   transports: ["websocket"],
   reconnectionDelay: 1000,
   reconnectionDelayMax: 10000,
   extraHeaders: {
      "bearer-token": "mytoken",
   },
};

export default function useExpressXClient() {
   // Only create socket on first call, not at import time
   if (!socket) {
      socket = io(socketOptions);
   }
   const app = expressXClient(socket, { debug: false });

   const { restartApp } = useAuthentication(app);

   const cnxid = useSessionStorage('cnxid', '')
   app.getCnxId = () => cnxid.value;

   app.addErrorListener((socket, err) => {
      console.log('CNX ERROR!!!', socket.id, err)
   })

   app.addConnectListener(async (socket) => {
      const socketId = socket.id
      console.log('connect', socketId)
      // handle reconnections & reloads
      // look for a previously stored connection id
      const prevSocketId = cnxid.value
      if (prevSocketId) {
         // it's a connection after a reload/refresh
         // ask server to transfer all data from connection `prevSocketId` to connection `socketId`
         console.log('cnx-transfer', prevSocketId, 'to', socketId)
         await socket.emit('cnx-transfer', prevSocketId, socketId)
         // update connection id
         cnxid.value = socketId

      } else {
         // set connection id
         cnxid.value = socketId
      }

      socket.on('cnx-transfer-ack', async (fromSocketId, toSocketId) => {
         console.log('ACK ACK!!!', fromSocketId, toSocketId)
      })

      socket.on('cnx-transfer-error', async (fromSocketId, toSocketId) => {
         console.log('ERR ERR!!!', fromSocketId, toSocketId)
         // appState.value.unrecoverableError = true
      })
      
      socket.on('expiresAt', async (expiresAt) => {
         console.log("server sent 'expiresAt' event", expiresAt)
         // store expiration date in appState
         setExpiresAt(expiresAt)
         if (!expiresAt) {
            await restartApp()
         }
      })
   })

   app.addConnectListener(async (socket) => {
      connectedDate.value = new Date()
      console.log('onConnect', connectedDate.value)
      disconnectedDate.value = null
   })

   app.addDisconnectListener(async (socket) => {
      connectedDate.value = null
      disconnectedDate.value = new Date()
      console.log('onDisconnect', disconnectedDate.value)
   })

   app.isConnected = () => !!connectedDate?.value;

   app.getDisconnectedDate = () => disconnectedDate?.value;

   app.connect = () => {
      console.log('connecting...')
      socket && socket.connect()
   }

   app.disconnect = () => {
      console.log('disconnecting...')
      socket && socket.disconnect()
   }

   return { app, connectedDate, disconnectedDate } ;
}
