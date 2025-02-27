import { computed } from 'vue'
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

// return a reactive object (convert promise into an observable, then into a reactive object)
// export const getUserRef = (id) => useObservable(from(getUserPromise(id)))
export const getUserRef = (id) => {
   const promise = getUserPromise(id)
   promise.then(x => console.log('x', x))
   return useObservable(from(promise))
}


export const getUserListPromise = async (whereTag, whereDatabase, wherePredicate) => {
   const listStatus = await db.listStatus.get(whereTag)
   if (listStatus?.status === 'ready')
      return await db.values.filter(wherePredicate).toArray()
   const list = await app.service('user').findMany({ where: whereDatabase })
   for (const value of list) {
      await db.values.put(value)
   }
   db.listStatus.put({ whereTag, status: 'ready'})
   return list
}

// return a reactive object (convert promise into an observable, then into a reactive object)
// export const getUserListRef = (whereTag, whereDatabase, wherePredicate) =>
//    useObservable(from(getUserListPromise(whereTag, whereDatabase, wherePredicate)))
export const getUserListRef = (whereTag, whereDatabase, wherePredicate) => {
   const promise = getUserListPromise(whereTag, whereDatabase, wherePredicate)
   promise.then(l => console.log('l', l))
   return useObservable(from(promise))
}




// export const getUser = async (id) => {
//    const { value, promise } = fetchAndCache(id, app.service('user'), userState?.value.userStatus, userState?.value.userCache)
//    return value || await promise
// }

// export const getUserRef = computed(() => (id) => {
//    const { value } = fetchAndCache(id, app.service('user'), userState?.value.userStatus, userState?.value.userCache)
//    return value
// })

// export const createUser = async (data) => {
//    const user = await app.service('user').create({ data })
//    // update cache
//    userState.value.userCache[user.id] = user
//    userState.value.userStatus[user.id] = 'ready'
//    return user
// }

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
