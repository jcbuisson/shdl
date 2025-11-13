import { io } from "socket.io-client";
import Dexie from "dexie";
import expressXClient from '@jcbuisson/express-x-client';

import { synchronize } from '/src/lib/synchronize.js';


const socketOptions = {
   path: '/shdl-socket-io/',
   transports: ["websocket"],
   reconnectionDelay: 1000,
   reconnectionDelayMax: 10000,
};
const socket = io(socketOptions);

const app = expressXClient(socket, { debug: true });

let db, modelName;


// handle message coming from main script
self.onmessage = async (event) => {
   const { id, data } = event.data;
   let result;

   try {
      // execute task, described as an array: [code, ...args]
      const [code, ...args] = data;


      if (code === 'init') {
         const [dbName, modelName_, fields, email, password] = args;

         db = new Dexie(dbName);
         modelName = modelName_;

         db.version(1).stores({
            whereList: "sortedjson",
            values: ['uid', '__deleted__', ...fields].join(','), // ex: "uid, __deleted__, email, firstname, lastname",
            metadata: "uid, created_at, updated_at, deleted_at",
         });

         const { user } = await app.service('auth').signin(email, password);
         console.log('worker init signed in', dbName, modelName, user);
         result = user;


      } else if (code === 'synchronize') {
         const [where, disconnectedDate] = args;
         await synchronize(app, modelName, db.values, db.metadata, where, disconnectedDate);
         result = 'oksync';
      }

      // Post the result and the original ID back to the main thread
      self.postMessage({ id, result });
   } catch (e) {
      // Post the error and the original ID back for rejection
      self.postMessage({ id, error: e.message });
   }
};
