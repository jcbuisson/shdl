import { io } from "socket.io-client"
import Dexie from "dexie"
import expressXClient from '@jcbuisson/express-x-client'

const socketOptions = {
   path: '/shdl-socket-io/',
   transports: ["websocket"],
   reconnectionDelay: 1000,
   reconnectionDelayMax: 10000,
}
const socket = io(socketOptions)

const app = expressXClient(socket, { debug: true })

let db;


// handle message coming from main script
self.onmessage = async (event) => {
   console.log("Worker received", event.data);
   const { id, data } = event.data;
   let result;

   try {
      // execute task
      const [code, ...args] = data;

      if (code === 'init') {
         const [dbName, modelName, fields, email, password] = args;

         db = new Dexie(dbName);

         db.version(1).stores({
            whereList: "sortedjson",
            values: ['uid', '__deleted__', ...fields].join(','), // ex: "uid, __deleted__, email, firstname, lastname",
            metadata: "uid, created_at, updated_at, deleted_at",
         });

         // const { user, expiresAt } = await app.service('auth').signin(email, password);
         // console.log('signed in', dbName, modelName, user);
         // result = user;
         result = 234;

      } else if (code === 'sync') {
         const [where, disconnectedDate] = args;
         console.log('syncccc', where, disconnectedDate)
      }

      // Post the result and the original ID back to the main thread
      self.postMessage({ id, result });
   } catch (e) {
      // Post the error and the original ID back for rejection
      self.postMessage({ id, error: e.message });
   }
};
