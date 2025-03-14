import Dexie from "dexie"
import { liveQuery } from "dexie"
import { useObservable } from "@vueuse/rxjs"
import { v4 as uuidv4 } from 'uuid'

import { wherePredicate, synchronize, addSynchroWhere } from '/src/lib/synchronize.js'
import { app, offlineDate } from '/src/client-app.js'

export const db = new Dexie("groupDatabaseSHDL")

db.version(1).stores({
   whereList: "id++",
   values: "uid, createdAt, updatedAt, name, deleted_"
})

export const resetUseGroup = async () => {
   await db.whereList.clear()
   await db.values.clear()
}

app.service('group').on('create', async group => {
   console.log('GROUP EVENT created', group)
   await db.values.put(group)
})

app.service('group').on('update', async group => {
   console.log('GROUP EVENT update', group)
   await db.values.put(group)
})

app.service('group').on('delete', async group => {
   console.log('GROUP EVENT delete', group)
   await db.values.delete(group.id)
})


export const getGroupPromise = async (id) => {
   let value = await db.values.get(id)
   if (value) return value
   value = await app.service('group').findUnique({ where: { id }})
   await db.values.put(value)
   return value
}

export const getGroupRef = (id) => {
   // asynchronously fetch value if it is not in cache
   db.values.get(id).then(value => {
      if (value === undefined) {
         app.service('group', { volatile: true }).findUnique({ where: { id }}).then(value => {
            db.values.put(value)
         })
      }
   })
   const observable = liveQuery(() => db.values.get(id))
   return useObservable(observable)
}


// export const getGroupListRef = (whereTag, whereDatabase, wherePredicate) => {
//    // asynchronously fetch values if status isn't ready (= values are not in cache)
//    db.listStatus.get(whereTag).then(listStatus => {
//       if (listStatus?.status !== 'ready') {
//          app.service('group', { volatile: true }).findMany({ where: whereDatabase }).then(values => {
//             const promiseList = values.map(value => db.values.put(value))
//             return Promise.all(promiseList)
//          }).then(() => {
//             db.listStatus.put({ whereTag, status: 'ready' })
//          }).catch(err => {
//             console.log('err', err)
//          })
//       }
//    })
//    const observable = liveQuery(() => db.values.filter(wherePredicate).toArray())
//    return useObservable(observable)
// }


export async function addGroup(data) {
   const uid = uuidv4()
   console.log('create user', uid)
   // enlarge perimeter
   addSynchroWhere({ uid }, db.whereList)
   // optimistic update
   await db.values.add({ uid, ...data })
   // perform request on backend (if connection is active)
   await app.service('group', { volatile: true }).create({ data: { uid, ...data } })
}


export const updateGroup = async (id, data) => {
   // optimistic update of cache
   db.values.update(id, data)
   // execute on server
   const group = await app.service('group', { volatile: true }).update({
      where: { id },
      data,
   })
   return group
}

// export const removeGroup = async (id) => {
//    await app.service('group', { volatile: true }).delete({ where: { id }})
//    delete groupState.value.groupCache[id]
//    delete groupState.value.groupStatus[id]
// }


/////////////          SYNCHRONIZATION          /////////////

export async function selectValues(where) {
   if (addSynchroWhere(where, db.whereList)) {
      await synchronize(app, 'group', db.values, where, offlineDate.value)
   }
   const predicate = wherePredicate(where)
   const values = db.values.filter(value => !value.deleted_ && predicate(value)).toArray()
   return values
}

export function selectObservable(where) {
   // start synchronization if `where` is new
   if (addSynchroWhere(where, db.whereList)) {
      synchronize(app, 'group', db.values, where, offlineDate.value).then(() => {
         console.log('synchronize group', where, 'ended')
      })
   }
   // return observable for `where` values
   const predicate = wherePredicate(where)
   return liveQuery(() => db.values.filter(value => !value.deleted_ && predicate(value)).toArray())
}
