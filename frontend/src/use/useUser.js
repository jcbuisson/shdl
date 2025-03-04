import Dexie from "dexie"
import { liveQuery } from "dexie"
import { useObservable, from } from "@vueuse/rxjs"

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


// export const getUserPromise = async (id) => {
//    let value = await db.values.get(id)
//    if (value) return value
//    value = await app.service('user').findUnique({
//       where: { id },
//       include: {
//          groups: true,
//       },
//    })
//    await db.values.put(value)
//    return value
// }
export const getUserPromise = (id) => from(getUserObservable(id))

export const getUserObservable = (id) => {
   console.log('zzz', id)
   // asynchronously fetch value if it is not in cache
   db.values.get(id).then(value => {
      if (value === undefined) {
         app.service('user').app.service('user').findUnique({
            where: { id },
            include: {
               groups: true,
            },
         }).then(value => {
            db.values.put(value)
         })
      }
   })
   return liveQuery(() => db.values.get(id))
}

export const getUserRef = (id) => {
   return useObservable(getUserObservable(id))
}


export const getUserListRef = (whereTag, whereDatabase, wherePredicate) => {
   // asynchronously fetch values if status isn't ready (= values are not in cache)
   db.listStatus.get(whereTag).then(listStatus => {
      if (listStatus?.status !== 'ready') {
         app.service('user').findMany({
            where: whereDatabase,
            include: {
               groups: true,
            },
         }).then(values => {
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


export const createUser = async (data) => {
   // optimistic update of cache
   db.values.put(data)
   const user = await app.service('user').create({ data })
   // update cache
   // await db.values.put(user)
   return user
}

export const updateUser = async (id, data) => {
   // optimistic update of cache
   db.values.update(id, data)
   // execute on server
   const user = await app.service('user').update({
      where: { id },
      data,
      include: {
         groups: true,
      },
   })
   return user
}

export const updateUserGroups = async (id, newGroups) => {
   const user = await app.service('user').update({
      where: { id },
      data: {
         groups: {
            // connect, disconnect, set: https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries#disconnect-all-related-records
            set: newGroups.map(id => ({ id })),
         }
      },
      include: {
         groups: true,
      },
   })
   await db.values.put(user)
   return user
}

export const updateUserTabs = async (id, tabs) => {
   const user = await app.service('user').update({
      where: { id },
      data: {
         tabs
      },
      include: {
         groups: true,
      },
   })
   await db.values.put(user)
   return user
}

// export const removeUser = async (id) => {
//    await app.service('user').delete({ where: { id }})
//    delete userState.value.userCache[id]
//    delete userState.value.userStatus[id]
// }
