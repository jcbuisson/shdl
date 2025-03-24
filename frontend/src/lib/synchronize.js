
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

function isIncluded(where, whereList) {
   for (const w of whereList) {
      if (isSubset(w, where)) return true
   }
   return false
}

function isSubset(subset, fullObject) {
   return Object.entries(subset).some(([key, value]) => fullObject[key] === value)
}

function isMoreSpecific(subset, fullObject) {
   return Object.entries(subset).some(([key, value]) => fullObject[key] === value)
}
 
async function getWhereList(whereDb) {
   const list = await whereDb.toArray()
   return list.map(elt => elt.where)
}

// export async function addSynchroWhere(where, whereDb) {
//    const whereList = await getWhereList(whereDb)
//    // if `where` is identical or more specific than an element of `whereList`, return false
//    console.log('isIncluded', whereDb.db.idbdb.name, isIncluded(where, whereList), where, whereList)
//    if (isIncluded(where, whereList)) return false
//    console.log('adding where', whereDb.db.idbdb.name, where)
//    await whereDb.add({ where })
//    return true
// }

export async function addSynchroWhere(where, whereDb) {
   const whereList = await getWhereList(whereDb)
   for (const w of whereList) {
      // if `where` is more specific than one of the elements of `whereList`, do nothing
      if (isMoreSpecific(where, w)) return false
      // if one of the elements of `whereList` is more specific than `where`, replace it by `where`
      if (isMoreSpecific(w, where)) {
         await whereDb.delete(w.uid)
         await whereDb.add({ where })
         return true
      }
   }
   // `where` is not included, nor includes, one of the elements of `whereList`: append it to the existing set
   await whereDb.add({ where })
   return true
}

export async function removeSynchroWhere(where, whereDb) {
   await whereDb.filter(w => isSubset(w, where)).delete()
}

export async function synchronizeModelWhereList(app, modelName, clientCache, cutoffDate, whereDb) {
   const whereList = await getWhereList(whereDb)
   for (const where of whereList) {
      await synchronize(app, modelName, clientCache, where, cutoffDate)
   }
}
