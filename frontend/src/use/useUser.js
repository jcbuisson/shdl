import { computed } from 'vue'
import Dexie from "dexie"
import { liveQuery } from "dexie"
import { useObservable } from "@vueuse/rxjs"

import { app } from '/src/client-app.js'

export const db = new Dexie("user-database")

db.version(1).stores({
   values: "id",
   valuesStatus: "id",
})


app.service('user').on('create', async user => {
   console.log('USER EVENT created', user)
   await db.values.put(user)
   await db.valuesStatus.put({ id: user.id, status: 'ready'})
})

app.service('user').on('update', async user => {
   console.log('USER EVENT update', user)
   await db.values.put(user)
   await db.valuesStatus.update(user.id, { status: 'ready'})
   sessionStorage.setItem('expiresAt', user.expiresAt)
})

app.service('user').on('delete', async user => {
   console.log('USER EVENT delete', user)
   await db.valuesStatus.delete(user.id)
   await db.values.delete(user.id)
   sessionStorage.setItem('expiresAt', user.expiresAt)
})

export function getFullname(user) {
   if (!user) return ''
   if (user.firstname && user.lastname) return user.firstname + ' ' + user.lastname
   return user.firstname || user.lastname
}

export const getReactiveUser = (id) => {
   db.valuesStatus.get(id).then(valueStatus => {
      if (valueStatus?.status !== 'ready' && valueStatus?.status !== 'ongoing') {
         const promise = app.service('user').findUniqueOrThrow({ where: { id }})
         db.valuesStatus.put({ id, status: 'ongoing'})
         promise.then(async value => {
            await db.values.put(value)
            await db.valuesStatus.put({ id: value.id, status: 'ready'})
         }).catch(async err => {
            await db.valuesStatus.delete(id)
         })
      }
   })
   // return reactive ref
   return useObservable(liveQuery(() => db.values.get(id)))
}

// export const getUser = async (id) => {
//    const { value, promise } = fetchAndCache(id, app.service('user'), userState?.value.userStatus, userState?.value.userCache)
//    return value || await promise
// }

// export const userOfId = computed(() => (id) => {
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
//    const { value } = fetchAndCacheList(app.service('user'), {}, ()=>true, userState?.value.userStatus, userState?.value.userCache, userState?.value.userListStatus)
//    return value
// })
