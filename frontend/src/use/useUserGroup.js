import Dexie from "dexie"
import { liveQuery } from "dexie"
import { useObservable } from "@vueuse/rxjs"

import { app } from '/src/client-app.js'

export const db = new Dexie("userGroupDatabase")

db.version(1).stores({
   values: "id",
   listStatus: "whereTag",
})

export const resetUseGroup = async () => {
   await db.values.clear()
   await db.listStatus.clear()
}

app.service('user_group').on('create', async userGroup => {
   console.log('USER_GROUP EVENT created', userGroup)
   await db.values.put(userGroup)
})

app.service('user_group').on('update', async userGroup => {
   console.log('USER_GROUP EVENT update', userGroup)
   await db.values.put(userGroup)
})

app.service('user_group').on('delete', async userGroup => {
   console.log('USER_GROUP EVENT delete', userGroup)
   await db.values.delete(userGroup.id)
})


// export const getGroupPromise = async (id) => {
//    let value = await db.values.get(id)
//    if (value) return value
//    value = await app.service('user_group').findUnique({ where: { id }})
//    await db.values.put(value)
//    return value
// }

// export const getGroupRef = (id) => {
//    // asynchronously fetch value if it is not in cache
//    db.values.get(id).then(value => {
//       if (value === undefined) {
//          app.service('user_group').app.service('user_group').findUnique({ where: { id }}).then(value => {
//             db.values.put(value)
//          })
//       }
//    })
//    const observable = liveQuery(() => db.values.get(id))
//    return useObservable(observable)
// }


export const getUserGroupListRef = (userid) => {
   // asynchronously fetch values if status isn't ready (= values are not in cache)
   db.listStatus.get(userid).then(listStatus => {
      if (listStatus?.status !== 'ready') {
         app.service('user_group').findMany({ where: whereDatabase }).then(list => {
            for (const value of list) {
               db.values.put(value)
            }
         })
      }
   })
   const observable = liveQuery(() => db.values.filter(wherePredicate).toArray())
   return useObservable(observable)
}


export const createUserGroup = async (data) => {
   const userGroup = await app.service('user_group').create({ data })
   // update cache
   await db.values.put(userGroup)
   return userGroup
}

export const deleteUserGroup = async (id) => {
   const userGroup = await app.service('user_group').delete({
      where: { id },
   })
   // update cache
   await db.values.delete(id)
   return userGroup
}
