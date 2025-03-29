
import { sortedJson, Mutex } from "/src/lib/utilities"

const mutex = new Mutex()

// ex: where = { uid: 'azer' }
export async function synchronize(app, modelName, clientCache, where, cutoffDate) {
   await mutex.acquire()

   const requestPredicate = wherePredicate(where)

   // collect meta-data of local values
   const allValues = await clientCache.toArray()
   const clientMetadataDict = allValues.reduce((accu, elt) => {
      if (requestPredicate(elt)) accu[elt.uid] = {
         uid: elt.uid,
         created_at: elt.created_at,
         updated_at: elt.updated_at,
         deleted_at: elt.deleted_at,
      }
      return accu
   }, {})
   
   // call sync service on `where` perimeter
   const { toAdd, toUpdate, toDelete, addDatabase, updateDatabase } = await app.service('sync').go(modelName, where, cutoffDate, clientMetadataDict)
   console.log('synchronize', toAdd, toUpdate, toDelete, addDatabase, updateDatabase)

   // 1- add missing elements in cache
   for (const elt of toAdd) {
      await clientCache.add(elt)
   }
   // 2- delete elements from cache
   for (const uid of toDelete) {
      await clientCache.delete(uid)
   }
   // 3- update elements of cache
   for (const elt of toUpdate) {
      // get full value of element to update
      const fullElt = await app.service(modelName).findUnique({ where: { uid: elt.uid }})
      await clientCache.update(elt.uid, fullElt)
   }

   // 4- create elements of `addDatabase` with full data from cache
   for (const elt of addDatabase) {
      const fullValue = await clientCache.get(elt.uid)
      await app.service(modelName).create({ data: fullValue })
   }

   // 5- update elements of `updateDatabase` with full data from cache
   for (const elt of updateDatabase) {
      const fullValue = await clientCache.get(elt.uid)
      await app.service(modelName).update({
         where: { uid: elt.uid },
         data: fullValue,
      })
   }
   await mutex.release()
   return clientCache
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

export async function addSynchroWhere(where, whereDb) {
   await mutex.acquire()
   let over = false
   let modified = false
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
   await mutex.release()
   return modified
}

export async function removeSynchroWhere(where, whereDb) {
   await mutex.acquire()
   const sortedjson = sortedJson(where)
   await whereDb.filter(value => value.sortedjson === sortedjson).delete()
   await mutex.release()
}

export async function synchronizeModelWhereList(app, modelName, clientCache, cutoffDate, whereDb) {
   const whereList = await getWhereList(whereDb)
   for (const where of whereList) {
      await synchronize(app, modelName, clientCache, where, cutoffDate)
   }
}
