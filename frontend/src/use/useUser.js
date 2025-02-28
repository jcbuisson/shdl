import Dexie from "dexie"
import { liveQuery } from "dexie"
import { useObservable } from "@vueuse/rxjs"
import { from } from 'rxjs'

import { app } from '/src/client-app.js'

export const db = new Dexie("userDatabase")

db.version(1).stores({
   values: "id",
   listStatus: "whereTag",
})

export const resetUseUser = async () => {
   await db.values.clear()
   await db.listStatus.clear()
}

app.service('user').on('create', async user => {
   console.log('USER EVENT created', user)
   await db.values.put(user)
})

app.service('user').on('update', async user => {
   console.log('USER EVENT update', user)
   await db.values.put(user)
})

app.service('user').on('delete', async user => {
   console.log('USER EVENT delete', user)
   await db.values.delete(user.id)
})

export function getFullname(user) {
   if (!user) return ''
   if (user.firstname && user.lastname) return user.lastname + ' ' + user.firstname
   return user.lastname || user.firstname
}


export const getUserPromise = async (id) => {
   let value = await db.values.get(id)
   if (value) return value
   value = await app.service('user').findUnique({ where: { id }})
   await db.values.put(value)
   return value
}

export const getUserRef = (id) => {
   // asynchronously fetch value if it is not in cache
   db.values.get(id).then(value => {
      if (value === undefined) {
         app.service('user').app.service('user').findUnique({ where: { id }}).then(value => {
            db.values.put(value)
         })
      }
   })
   const observable = liveQuery(() => db.values.get(id))
   return useObservable(observable)
}


export const getUserListRef = (whereTag, whereDatabase, wherePredicate) => {
   // asynchronously fetch values if status isn't ready (= values are not in cache)
   db.listStatus.get(whereTag).then(listStatus => {
      if (listStatus?.status !== 'ready') {
         app.service('user').findMany({ where: whereDatabase }).then(list => {
            for (const value of list) {
               db.values.put(value)
            }
         })
      }
   })
   const observable = liveQuery(() => db.values.filter(wherePredicate).toArray())
   return useObservable(observable)
}


export const createUser = async (data) => {
   const user = await app.service('user').create({ data })
   // update cache
   await db.values.put(user)
   return user
}

// export const updateUser = async (id, data) => {
//    const user = await app.service('user').update({
//       where: { id },
//       data,
//    })
//    // update cache
//    userState.value.userCache[id] = user
//    userState.value.userStatus[id] = 'ready'
//    return user
// }

// export const removeUser = async (id) => {
//    await app.service('user').delete({ where: { id }})
//    delete userState.value.userCache[id]
//    delete userState.value.userStatus[id]
// }

// export const listOfUser = computed(() => {
//    const { value } = fetchAndCacheList(app.service('user'), {}, ()=>true, userState?.value.userStatus, userState?.value.userCache, userState?.value.listStatus)
//    return value
// })
