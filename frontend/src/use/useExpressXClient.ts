import { io, Socket } from "socket.io-client";
import { createClient } from '@jcbuisson/express-x/client'
import {  electricClientPlugin } from '@jcbuisson/express-x-plugins/electric-client'

import { setExpiresAt } from "/src/use/useAppState"
import { useAuthentication } from "/src/use/useAuthentication"


let socket: Socket | null = null;
let app: any = null;

function configureReload(app: any) {
   const handleTransferToken = (token: unknown) => {
      if (typeof token === 'string') sessionStorage.setItem('cnxtoken', token)
   }

   app.addConnectListener(async (socket: Socket) => {
      const socketId = socket.id
      const previousSocketId = sessionStorage.getItem('cnxid')
      const previousTransferToken = sessionStorage.getItem('cnxtoken')

      socket.off('cnx-transfer-token', handleTransferToken)
      socket.on('cnx-transfer-token', handleTransferToken)
      if (socketId) sessionStorage.setItem('cnxid', socketId)

      if (previousSocketId && previousTransferToken && socketId) {
         socket.emit('cnx-transfer', previousSocketId, socketId, previousTransferToken)
      }
   })
}

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
   if (!app) {
      socket = io(socketOptions);
      app = createClient(socket, { debug: false });

      app.configure(electricClientPlugin, {
         // Keep Electric's long-polling requests out of Vite's HTTP/1.1
         // connection pool so that page navigations cannot be starved.
         shapePath: new URL(
            '/electric/v1/shape',
            import.meta.env.DEV
               ? `${window.location.protocol}//${window.location.hostname}:3016`
               : window.location.origin,
         ).href,
      })

      // reload plugin: handles cnx-transfer on page reload (persists socket id in sessionStorage)
      configureReload(app);

      const { restartApp } = useAuthentication(app);

      app.addErrorListener((socket: Socket, err: unknown) => {
         console.log('CNX ERROR!!!', socket.id, err)
      })

      socket.on('expiresAt', async (expiresAt: unknown) => {
         console.log("server sent 'expiresAt' event", expiresAt)
         setExpiresAt(expiresAt)
         if (!expiresAt) {
            await restartApp()
         }
      })

      app.connect = () => {
         console.log('connecting...')
         socket && socket.connect()
      }

      app.disconnect = () => {
         console.log('disconnecting...')
         socket && socket.disconnect()
      }
   }

   return { app };
}
