import { io, Socket } from "socket.io-client";
import { createClient, reloadPlugin, offlinePlugin } from "@jcbuisson/express-x-client";

import { setExpiresAt } from "/src/use/useAppState"
import { useAuthentication } from "/src/use/useAuthentication"


let socket: Socket | null = null;
let app: any = null;

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

      // offline-first plugin: adds app.createOfflineModel, app.isConnected, app.disconnectedDate
      offlinePlugin(app);

      // reload plugin: handles cnx-transfer on page reload (persists socket id in sessionStorage)
      reloadPlugin(app);

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
