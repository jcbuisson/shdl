import { computed } from 'vue'
import Dexie from "dexie"
import { liveQuery } from "dexie"
import { useObservable } from "@vueuse/rxjs"
import { from } from 'rxjs'

import { app } from '/src/client-app.js'

export const db = new Dexie("userDatabase")

db.version(1).stores({
   values: "id",
   valuesStatus: "id",
   listStatus: "whereTag",
})

export const resetUseUser = async () => {
   await db.values.clear()
   await db.valuesStatus.clear()
}

app.service('user').on('create', async user => {
   console.log('USER EVENT created', user)
   await db.values.put(user)
   await db.valuesStatus.put({ id: user.id, status: 'ready'})
})

app.service('user').on('update', async user => {
   console.log('USER EVENT update', user)
   await db.values.put(user)
   await db.valuesStatus.update(user.id, { status: 'ready'})
})

app.service('user').on('delete', async user => {
   console.log('USER EVENT delete', user)
   await db.valuesStatus.delete(user.id)
   await db.values.delete(user.id)
})

export function getFullname(user) {
   if (!user) return ''
   if (user.firstname && user.lastname) return user.lastname + ' ' + user.firstname
   return user.lastname || user.firstname
}

// return a promise
export const getUserPromise = async (id) => {
   const valueStatus = await db.valuesStatus.get(id)
   let value = await db.values.get(id)
   if (valueStatus?.status !== 'ready' && valueStatus?.status !== 'ongoing') {
      try {
         value = await app.service('user').findUnique({ where: { id }})
         await db.values.put(value)
         await db.valuesStatus.put({ id: value.id, status: 'ready'})
      } catch(err) {
         console.log('getUserPromise err', err)
         setTimeout(async () => {
            await db.valuesStatus.delete(id)
         }, 500)
      }
   }
   return value
}

// return a reactive object (convert promise into an observable, then into a reactive object)
export const getUserRef = (id) =>
   useObservable(from(getUserPromise(id)))


export const getUserListPromise = async (whereTag, whereDatabase, wherePredicate) => {
   const listStatus = await db.listStatus.get(whereTag)
   let list = await db.values.filter(wherePredicate).toArray()
   if (listStatus?.status !== 'ready' && listStatus?.status !== 'ongoing') {
      try {
         list = await app.service('user').findMany({ where: whereDatabase })
         for (const value of list) {
            await db.values.put(value)
            await db.valuesStatus.put({ id: value.id, status: 'ready'})
         }
         db.listStatus.put({ whereTag, status: 'ready'})
      } catch(err) {
         console.log('getUserListPromise err', err)
         setTimeout(async () => {
            await db.listStatus.delete(whereTag)
         }, 500)
      }
   }
   return list
}

// return a reactive object (convert promise into an observable, then into a reactive object)
export const getUserListRef = (whereTag, whereDatabase, wherePredicate) =>
   useObservable(from(getUserListPromise(whereTag, whereDatabase, wherePredicate)))

// // ex: whereTag = 'role-admin', whereDatabase = { role: 'admin' }, wherePredicate = (user) => user.role === 'admin'
// export const listOfUser = computed(() => (whereTag, whereDatabase, wherePredicate) => {
//    db.listStatus.get(whereTag).then(listStatus => {
//       if (listStatus?.status !== 'ready' && listStatus?.status !== 'ongoing') {
//          db.listStatus.put({ whereTag, status: 'ongoing'})
//          const promise = app.service('user').findMany({ where: whereDatabase })
//          promise.then(async list => {
//             for (const value of list) {
//                await db.values.put(value)
//                await db.valuesStatus.put({ id: value.id, status: 'ready'})
//             }
//             db.listStatus.put({ whereTag, status: 'ready'})
//          })
//          .catch(err => {
//             console.log('getUserRefList err', err)
//             setTimeout(async () => {
//                await db.listStatus.delete(whereTag)
//             }, 500)
//          })
//       }
//    })
//    // return reactive ref
//    return useObservable(liveQuery(() => db.values.filter(wherePredicate).toArray()))
// })




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
