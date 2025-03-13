import Dexie from "dexie"
import { liveQuery } from "dexie"
import { useObservable } from "@vueuse/rxjs"
import { v4 as uuidv4 } from 'uuid'

import { app } from '/src/client-app.js'

export const db = new Dexie("groupDatabaseSHDL")

db.version(1).stores({
   values: "id",
   listStatus: "whereTag",
})

export const resetUseGroup = async () => {
   await db.values.clear()
   await db.listStatus.clear()
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


export const getGroupListRef = (whereTag, whereDatabase, wherePredicate) => {
   // asynchronously fetch values if status isn't ready (= values are not in cache)
   db.listStatus.get(whereTag).then(listStatus => {
      if (listStatus?.status !== 'ready') {
         app.service('group', { volatile: true }).findMany({ where: whereDatabase }).then(values => {
            const promiseList = values.map(value => db.values.put(value))
            return Promise.all(promiseList)
         }).then(() => {
            db.listStatus.put({ whereTag, status: 'ready' })
         }).catch(err => {
            console.log('err', err)
         })
      }
   })
   const observable = liveQuery(() => db.values.filter(wherePredicate).toArray())
   return useObservable(observable)
}


export const addGroup = async (data) => {
   const group = await app.service('group', { volatile: true }).create({ data })
   // update cache
   await db.values.put(group)
   return group
}

export const updateGroup = async (id, data) => {
   const group = await app.service('group', { volatile: true }).update({
      where: { id },
      data,
   })
   // update cache
   await db.values.update(id, data)
   return group
}

// export const removeGroup = async (id) => {
//    await app.service('group', { volatile: true }).delete({ where: { id }})
//    delete groupState.value.groupCache[id]
//    delete groupState.value.groupStatus[id]
// }
