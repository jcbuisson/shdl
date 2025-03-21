
// ex: where = { uid: 'azer' }
export async function synchronize(app, modelName, clientCache, where, cutoffDate) {
   const requestPredicate = wherePredicate(where)

   const allValues = await clientCache.toArray()
   const clientValuesDict = allValues.reduce((accu, elt) => {
      if (requestPredicate(elt)) accu[elt.uid] = elt
      return accu
   }, {})

   // call sync service on `where` perimeter
   const { toAdd, toUpdate, toDelete } = await app.service('sync').go(modelName, where, cutoffDate, clientValuesDict)
   console.log('synchronize', toAdd, toUpdate, toDelete)

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
      await clientCache.update(elt.uid, elt)
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

function isIncluded(where, whereList) {
   for (const w of whereList) {
      if (isSubset(w, where)) return true
   }
   return false
}

function isSubset(subset, fullObject) {
   return Object.entries(subset).some(([key, value]) => fullObject[key] === value)
}
 
async function getWhereList(whereDb) {
   const list = await whereDb.toArray()
   return list.map(elt => elt.where)
}

export async function addSynchroWhere(where, whereDb) {
   const whereList = await getWhereList(whereDb)
   // if `where` is identical or more specific than an element of `whereList`, return false
   if (isIncluded(where, whereList)) return false
   console.log('adding where', where)
   whereDb.add({ where })
   return true
}

export async function removeSynchroWhere(where, whereDb) {
   await whereDb.filter(w => isSubset(w, where)).delete()
}

export async function synchronizeWhereList(app, modelName, clientCache, cutoffDate, whereDb) {
   const whereList = await getWhereList(whereDb)
   for (const where of whereList) {
      await synchronize(app, modelName, clientCache, where, cutoffDate)
   }
}
