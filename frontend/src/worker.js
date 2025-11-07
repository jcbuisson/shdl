
import { io } from "socket.io-client"
import expressXClient from '@jcbuisson/express-x-client'

const socketOptions = {
   path: '/shdl-socket-io/',
   transports: ["websocket"],
   reconnectionDelay: 1000,
   reconnectionDelayMax: 10000,
}
const socket = io(socketOptions)

const app = expressXClient(socket, { debug: true })

let dbName, modelName;
let signedinUser;

onmessage = async (e) => {
   console.log("Worker: Message received from main script", e.data);
   const [code, ...args] = e.data;

   if (code === 'signin') {
      const [dbName_, modelName_, email, password] = args;
      try {
         dbName = dbName_;
         modelName = modelName_;
         const { user, expiresAt } = await app.service('auth').signin(email, password);
         signedinUser = user;
         console.log('signed in', dbName, modelName, signedinUser);
      } catch(err) {
         console.log('*** err signin', err);
      }


   } else if (signedinUser) {
      const userList = await app.service('user').findMany();
      console.log('userList', userList)
   }

   postMessage({ c: 3, d: 4 });

};
