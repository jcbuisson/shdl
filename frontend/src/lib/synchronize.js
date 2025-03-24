
import { sortedJson, Mutex } from "/src/lib/utilities"

// ex: where = { uid: 'azer' }
export async function synchronize(app, modelName, clientCache, where, cutoffDate) {
   const requestPredicate = wherePredicate(where)

   // collect meta-data of local values
   const allValues = await clientCache.toArray()
   const clientValuesDict = allValues.reduce((accu, elt) => {
      if (requestPredicate(elt)) accu[elt.uid] = {
         uid: elt.uid,
         created_at: elt.created_at,
         updated_at: elt.updated_at,
      }
      return accu
   }, {})

   // call sync service on `where` perimeter
   const { toAdd, toUpdate, toDelete, updateDatabase } = await app.service('sync').go(modelName, where, cutoffDate, clientValuesDict)
   console.log('synchronize', toAdd, toUpdate, toDelete, updateDatabase)

   // update client cache according to server sync directives
   // 1- add missing elements
   for (const elt of toAdd) {
      await clientCache.add(elt)
   }
   // 2- delete removed elements
   for (const uid of toDelete) {
      await clientCache.delete(uid)
   }
   // 3- update elements
   for (const elt of toUpdate) {
      // get full value of element to update
      const fullElt = await app.service(modelName).findUnique({ where: { uid: elt.uid }})
      await clientCache.update(elt.uid, fullElt)
   }

   // update elements of `updateDatabase` with full data
   for (const elt of updateDatabase) {
      const fullElt = await clientCache.get(elt.uid)
      await app.service(modelName).update({
         where: { uid: elt.uid },
         data: fullElt,
      })
   }
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

const mutex = new Mutex()

export async function addSynchroWhere(where, whereDb) {
   await mutex.acquire()
   let over = false
   let added = false
   const whereList = await getWhereList(whereDb)
   for (const w of whereList) {
      // if `where` is included in `w`, stops
      if (isSubset(where, w)) { over = true; break }

      if (isSubset(w, where)) {
         await whereDb.delete(sortedJson(w))
         await whereDb.add({ sortedjson: sortedJson(where), where })
         over = true
         added = true
         break
      }
   }
   if (!over && !added) {
      // add `where` to the existing set
      await whereDb.add({ sortedjson: sortedJson(where), where })
      added = true
   }
   await mutex.release()
   return added
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
