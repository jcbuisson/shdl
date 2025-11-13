import Dexie from "dexie"
import { from } from 'rxjs'
import { liveQuery } from "dexie"
// uuidv7 are monotonically increasing and much improve database performance amid B-tree indexes
import { v7 as uuidv7 } from 'uuid'
import { tryOnScopeDispose } from '@vueuse/core'

import { wherePredicate, synchronize, addSynchroDBWhere, removeSynchroDBWhere, synchronizeModelWhereList } from '/src/lib/synchronize.js'
import useWorker from '/src/use/useWorker';


export function useModel(app) {

   function createModel(dbName: string, modelName: string, fields) {

      const db = new Dexie(dbName)

      db.version(1).stores({
         whereList: "sortedjson",
         values: ['uid', '__deleted__', ...fields].join(','), // ex: "uid, __deleted__, email, firstname, lastname",
         metadata: "uid, created_at, updated_at, deleted_at",
      })

      // db.open().then(() => console.log('db ready', dbName, modelName))

      const reset = async () => {
         console.log('reset', dbName, modelName)
         await db.whereList.clear()
         await db.values.clear()
         await db.metadata.clear()
      }

      let syncWorker: Worker;
      let workerApi: { sendToWorker: (data: any) => Promise<any> };

      const initWorker = async (email: string, password: string) => {
         console.log('initWorker', dbName, modelName, fields);
         if (!syncWorker) {
            console.log('new worker', modelName);
            syncWorker = new Worker(new URL("/src/worker.js", import.meta.url), { type: 'module' });
            workerApi = useWorker(syncWorker);

            const result = await workerApi.sendToWorker(['init', dbName, modelName, fields, email, password])
            console.log('result from worker', result)
         }
      }

      /////////////          PUB / SUB          /////////////

      app.service(modelName).on('createWithMeta', async ([value, meta]) => {
         console.log(`${modelName} EVENT createWithMeta`, value)
         await db.values.put(value)
         await db.metadata.put(meta)
      })

      app.service(modelName).on('updateWithMeta', async ([value, meta]) => {
         console.log(`${modelName} EVENT updateWithMeta`, value)
         await db.values.put(value)
         await db.metadata.put(meta)
      })

      app.service(modelName).on('deleteWithMeta', async ([value, meta]) => {
         console.log(`${modelName} EVENT deleteWithMeta`, value)
         await db.values.delete(value.uid)
         await db.metadata.put(meta)
      })


      /////////////          CREATE/UPDATE/REMOVE          /////////////

      async function create(data) {
         const uid = uuidv7()
         // optimistic update
         const now = new Date()
         await db.values.add({ uid, ...data })
         await db.metadata.add({ uid, created_at: now })
         // execute on server, asynchronously, if connection is active
         if (app.isConnected()) {
            app.service(modelName).createWithMeta(uid, data, now)
            .catch(async err => {
               console.log(`*** err sync ${modelName} create`, err)
               // rollback
               await db.values.delete(uid)
            })
         }
         return await db.values.get(uid)
      }

      const update = async (uid: string, data: object) => {
         const previousValue = { ...(await db.values.get(uid)) }
         const previousMetadata = { ...(await db.metadata.get(uid)) }
         // optimistic update of cache
         const now = new Date()
         await db.values.update(uid, data)
         await db.metadata.update(uid, { updated_at: now })
         // execute on server, asynchronously, if connection is active
         if (app.isConnected()) {
            app.service(modelName).updateWithMeta(uid, data, now)
            .catch(async err => {
               console.log(`*** err sync ${modelName} update`, err)
               // rollback
               delete previousValue.uid
               await db.values.update(uid, previousValue)
               delete previousMetadata.uid
               await db.metadata.update(uid, previousMetadata)
            })
         }
         return await db.values.get(uid)
      }

      const remove = async (uid: string) => {
         const deleted_at = new Date()
         // optimistic delete in cache
         await db.values.update(uid, { __deleted__: true })
         await db.metadata.update(uid, { deleted_at })
         // and in database, if connected
         if (isConnected.value) {
            app.service(modelName).deleteWithMeta(uid, deleted_at)
            .catch(async err => {
               console.log(`*** err sync ${modelName} remove`, err)
               // rollback
               await db.values.update(uid, { __deleted__: null })
               await db.metadata.update(uid, { deleted_at: null })
            })
         }
      }

      /////////////          DIRECT CACHE ACCESS          /////////////

      function findByUID(uid) {
         return db.values.get(uid)
      }

      function findWhere(where = {}) {
         const predicate = wherePredicate(where)
         return db.values.filter(value => !value.__deleted__ && predicate(value)).toArray()
      }

      /////////////          REAL-TIME OBSERVABLE          /////////////

      function getObservable(where = {}) {
         addSynchroWhere(where).then((isNew: boolean) => {
            if (isNew && app.isConnected()) {

               // synchronize(app, modelName, db.values, db.metadata, where, app.getDisconnectedDate())

               if (workerApi) {
                  workerApi.sendToWorker(['synchronize', where, app.getDisconnectedDate()]).then(result => {
                     console.log('result from worker/sync', result);
                  })
               } else {
                  // JCB : que faire ?
                  console.log('NOWORKER NOWORKER NOWORKER NOWORKER NOWORKER NOWORKER NOWORKER NOWORKER NOWORKER ');
               }
            }
         })
         const predicate = wherePredicate(where)
         return from(liveQuery(() => db.values.filter(value => !value.__deleted__ && predicate(value)).toArray()))
      }

      let count = 0;
      
      function addSynchroWhere(where: object) {
         // console.log('addSynchroWhere', dbName, modelName, where)
         // return addSynchroDBWhere(where, db.whereList)
         const promise = addSynchroDBWhere(where, db.whereList)
         promise.then(isNew => isNew && count++ && console.log(`addSynchroWhere (${count})`, dbName, modelName, where))
         return promise
      }

      function removeSynchroWhere(where: object) {
         console.log('removeSynchroWhere', dbName, modelName, where)
         count -= 1
         return removeSynchroDBWhere(where, db.whereList)
      }

      async function synchronizeAll() {
         await synchronizeModelWhereList(app, modelName, db.values, db.metadata, app.getDisconnectedDate(), db.whereList)
      }

      // Automatically clean up when the component using this composable unmounts
      tryOnScopeDispose(async () => {
         console.log('CLEANING', dbName, modelName)
         const whereList = await db.whereList.toArray()
         for (const where of whereList) {
            removeSynchroWhere(JSON.parse(where.sortedjson))
         }
      })

      return {
         db, reset,
         initWorker,
         syncWorker,
         create, update, remove,
         findByUID, findWhere,
         getObservable,
         synchronizeAll,
      }
   }

   return {
      createModel,
   }
}
