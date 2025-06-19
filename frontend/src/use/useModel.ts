import Dexie from "dexie"
import { from } from 'rxjs'
import { liveQuery } from "dexie"
import { uid as uid16 } from 'uid'
import { tryOnScopeDispose } from '@vueuse/core'

import { wherePredicate, synchronize, addSynchroDBWhere, removeSynchroDBWhere, synchronizeModelWhereList } from '/src/lib/synchronize.js'
import { app, isConnected, disconnectedDate } from '/src/client-app.js'


export default function(dbName: string, modelName: string, fields) {

   const db = new Dexie(dbName)

   db.version(1).stores({
      whereList: "sortedjson",
      values: ['uid', '__deleted__', ...fields].join(','), // ex: "uid, __deleted__, email, firstname, lastname",
      metadata: "uid, created_at, updated_at, deleted_at",
   })

   // db.open().then(() => console.log('db ready', dbName, modelName))

   const reset = async () => {
      await db.whereList.clear()
      await db.values.clear()
      await db.metadata.clear()
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

   
   async function create(data) {
      const uid = uid16(16)
      // optimistic update
      const now = new Date()
      await db.values.add({ uid, ...data })
      await db.metadata.add({ uid, created_at: now })
      // execute on server, asynchronously, if connection is active
      if (isConnected.value) {
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
      if (isConnected.value) {
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


   function getObservable(where = {}) {
      addSynchroWhere(where).then((isNew: boolean) => {
         if (isNew && isConnected.value) {
            synchronize(app, modelName, db.values, db.metadata, where, disconnectedDate.value)
         }
      })
      const predicate = wherePredicate(where)
      return from(liveQuery(() => db.values.filter(value => !value.__deleted__ && predicate(value)).toArray()))
   }

   function addSynchroWhere(where: object) {
      console.log('addSynchroWhere', dbName, modelName, where)
      return addSynchroDBWhere(where, db.whereList)
   }

   function removeSynchroWhere(where: object) {
      console.log('removeSynchroWhere', dbName, modelName, where)
      return removeSynchroDBWhere(where, db.whereList)
   }

   async function synchronizeAll() {
      await synchronizeModelWhereList(app, modelName, db.values, db.metadata, disconnectedDate.value, db.whereList)
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
      create, update, remove,
      getObservable,
      synchronizeAll,
   }
}
