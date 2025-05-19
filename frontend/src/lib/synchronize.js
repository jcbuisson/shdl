
import { sortedJson, Mutex } from "/src/lib/utilities"

const mutex = new Mutex()

// ex: where = { uid: 'azer' }
export async function synchronize(app, modelName, idbValues, idbMetadata, where, cutoffDate) {
   await mutex.acquire()
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
      const { toAdd, toUpdate, toDelete, addDatabase, updateDatabase } = await app.service('sync').go(modelName, where, cutoffDate, clientMetadataDict)
      console.log('synchronize', modelName, where, toAdd, toUpdate, toDelete, addDatabase, updateDatabase)

      // 1- add missing elements in cache
      for (const [value, metaData] of toAdd) {
         await idbValues.add(value)
         await idbMetadata.add(metaData)
      }
      // 2- delete elements from cache
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
      for (const [key, value] of Object.entries(where)) {
         // implements only 'attr = value' clauses 
         if (elt[key] !== value) return false
      }
      return true
   }
}

function isSubset(subset, fullObject) {
   // return Object.entries(subset).some(([key, value]) => fullObject[key] === value)
   for (const key in fullObject) {
      if (fullObject[key] !== subset[key]) return false
   }
   return true
}
console.log('isSubset({a: 1, b: 2}, {b: 2})=true', isSubset({a: 1, b: 2}, {b: 2}))
console.log('isSubset({}, {})=true', isSubset({}, {}))
console.log('isSubset({a: 1}, {})=true', isSubset({a: 1}, {}))
console.log('isSubset({a: 1}, {b: 2})=false', isSubset({a: 1}, {b: 2}))
console.log('isSubset({a: 1}, {a: 1})=true', isSubset({a: 1}, {a: 1}))

 
async function getWhereList(whereDb) {
   const list = await whereDb.toArray()
   return list.map(elt => elt.where)
}

export async function addSynchroDBWhere(where, whereDb) {
   let modified = false
   await mutex.acquire()
   try {
      let over = false
      const whereList = await getWhereList(whereDb)
      for (const w of whereList) {
         // if `where` is included in `w`, do nothing and exit
         if (isSubset(where, w)) { over = true; break }
         // if `where` is more general than `w`, replace `w` by `where`
         if (isSubset(w, where)) {
            await whereDb.delete(sortedJson(w))
            await whereDb.add({ sortedjson: sortedJson(where), where })
            over = true
            modified = true
            break
         }
      }
      if (!over && !modified) {
         // add `where` to the existing set
         await whereDb.add({ sortedjson: sortedJson(where), where })
         modified = true
      }
   } catch(err) {
      console.log('err addSynchroDBWhere', err)
   } finally {
      mutex.release()
   }
   return modified
}

export async function removeSynchroDBWhere(where, whereDb) {
   await mutex.acquire()
   try {
      const sortedjson = sortedJson(where)
      await whereDb.filter(value => value.sortedjson === sortedjson).delete()
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
