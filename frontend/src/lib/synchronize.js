
import { stringifyWithSortedKeys, Mutex, isSubset, isSubsetAmong } from "/src/lib/utilities"

const mutex = new Mutex()

// ex: where = { uid: 'azer' }
export async function synchronize(app, modelName, idbValues, idbMetadata, where, cutoffDate) {
   await mutex.acquire()
   console.log('synchronize', modelName, where)

   let toAdd = []
   try {
      const requestPredicate = wherePredicate(where)

      // collect meta-data of local values
      // NOTE: __delete__ on values allows to collect metadata from cache-deleted values
      const valueList = await idbValues.filter(requestPredicate).toArray()
      const clientMetadataDict = {}
      for (const value of valueList) {
         const metadata = await idbMetadata.get(value.uid)
         if (metadata) {
            clientMetadataDict[value.uid] = metadata
         } else {
            // should not happen
            clientMetadataDict[value.uid] = {}
         }
      }

      // call sync service on `where` perimeter
      const syncResult = await app.service('sync').go(modelName, where, cutoffDate, clientMetadataDict)
      toAdd = syncResult.toAdd
      const { toUpdate, toDelete, addDatabase, updateDatabase } = syncResult
      console.log('-> service.sync', modelName, where, toAdd, toUpdate, toDelete, addDatabase, updateDatabase)

      // 1- add missing elements in indexedDB cache
      // Use a single transaction for all adds to ensure atomicity
      if (toAdd.length > 0) {
         await idbValues.db.transaction('rw', [idbValues, idbMetadata], async () => {
            for (const [value, metaData] of toAdd) {
               await idbValues.add(value)
               await idbMetadata.add(metaData)
            }
         })
      }
      // 2- delete elements from indexedDB cache
      for (const [uid, deleted_at] of toDelete) {
         await idbValues.delete(uid)
         await idbMetadata.update(uid, { deleted_at })
      }
      // 3- update elements of cache
      for (const elt of toUpdate) {
         // get full value of element to update
         const value = await app.service(modelName).findUnique({ where:{ uid: elt.uid }})
         delete value.uid
         delete value.__deleted__
         await idbValues.update(elt.uid, value)
         const metadata = await idbMetadata.get(elt.uid)
         await idbMetadata.update(elt.uid, { updated_at: metadata.updated_at })
      }

      // 4- create elements of `addDatabase` with full data from cache
      for (const elt of addDatabase) {
         const fullValue = await idbValues.get(elt.uid)
         const meta = await idbMetadata.get(elt.uid)
         delete fullValue.uid
         delete fullValue.__deleted__
         try {
            await app.service(modelName).createWithMeta(elt.uid, fullValue, meta.created_at)
         } catch(err) {
            console.log("*** err sync user addDatabase", err, elt.uid, fullValue, meta.created_at)
            // rollback
            await idbValues.delete(elt.uid)
            await idbMetadata.delete(elt.uid)
         }
      }

      // 5- update elements of `updateDatabase` with full data from cache
      for (const elt of updateDatabase) {
         const fullValue = await idbValues.get(elt.uid)
         const meta = await idbMetadata.get(elt.uid)
         delete fullValue.uid
         delete fullValue.__deleted__
         try {
            await app.service(modelName).updateWithMeta(elt.uid, fullValue, meta.updated_at)
         } catch(err) {
            console.log("*** err sync user updateDatabase", err)
            // rollback
            const previousDatabaseValue = await app.service(modelName).findUnique({ where:{ uid: elt.uid }})
            const previousDatabaseMetadata = await app.service('metadata').findUnique({ where:{ uid: elt.uid }})
            await idbValues.update(elt.uid, previousDatabaseValue)
            await idbMetadata.update(elt.uid, previousDatabaseMetadata)
         }
      }
   } catch(err) {
      console.log('err synchronize', modelName, where, err)
   } finally {
      mutex.release()
   }
}

export function wherePredicate(where) {
   return (elt) => {
      for (const [attr, value] of Object.entries(where)) {
         const eltAttrValue = elt[attr]

         if (typeof(value) === 'string' || typeof(value) === 'number') {
            // 'attr = value' clause
            if (eltAttrValue !== value) return false

         } else if (typeof(value) === 'object') {
            // 'attr = { lt/lte/gt/gte: value }' clause
            if (value.lte) {
               if (eltAttrValue > value.lte) return false
            } else if (value.lt) {
               if (eltAttrValue >= value.lt) return false
            } else if (value.gte) {
               if (eltAttrValue < value.gte) return false
            } else if (value.gt) {
               if (eltAttrValue <= value.gt) return false
            }
         }
      }
      return true
   }
}


async function getWhereList(whereDb) {
   const list = await whereDb.toArray()
   return list.map(elt => JSON.parse(elt.sortedjson))
}

export async function addSynchroDBWhere(where, whereDb) {
   await mutex.acquire()
   let modified = false
   try {
      const whereList = await getWhereList(whereDb)
      if (!isSubsetAmong(where, whereList)) {
         // sortedjson is used as a unique standardized representation of a 'where' object ; it is used both as key and value in 'wheredb' database
         await whereDb.add({ sortedjson: stringifyWithSortedKeys(where) })
         modified = true
      }
   } catch(err) {
      console.log('err addSynchroDBWhere', where, err)
   } finally {
      mutex.release()
   }
   return modified
}

export async function removeSynchroDBWhere(where, whereDb) {
   await mutex.acquire()
   try {
      const swhere = stringifyWithSortedKeys(where)
      await whereDb.filter(value => (value.sortedjson === swhere)).delete()
   } catch(err) {
      console.log('err removeSynchroDBWhere', err)
   } finally {
      mutex.release()
   }
}

export async function synchronizeModelWhereList(app, modelName, idbValues, idbMetadata, cutoffDate, whereDb) {
   const whereList = await getWhereList(whereDb)
   for (const where of whereList) {
      await synchronize(app, modelName, idbValues, idbMetadata, where, cutoffDate)
   }
}
