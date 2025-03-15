import Dexie from "dexie"
import { liveQuery } from "dexie"
import { v4 as uuidv4 } from 'uuid'

import { wherePredicate, synchronize, addSynchroWhere } from '/src/lib/synchronize.js'
import { app, offlineDate } from '/src/client-app.js'

export const db = new Dexie("userDatabaseSHDL")

db.version(1).stores({
   whereList: "id++",
   values: "uid, createdAt, updatedAt, email, firstname, lastname, deleted_"
})

export const resetUseUser = async () => {
   await db.whereList.clear()
   await db.values.clear()
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
   await db.values.delete(user.uid)
})


/////////////          METHODS          /////////////

// export const getUserObservable = (id) => {
//    // asynchronously fetch value if it is not in cache
//    db.values.get(id).then(value => {
//       if (value === undefined) {
//          app.service('user').app.service('user').findUnique({
//             where: { id },
//             include: {
//                groups: true,
//             },
//          }).then(value => {
//             db.values.put(value)
//          })
//       }
//    })
//    return liveQuery(() => db.values.get(id))
// }

// export const getUserPromise = (id) => from(getUserObservable(id))

// export const getUserRef = (id) => {
//    return useObservable(getUserObservable(id))
// }


// export const getUserListObservable = (whereTag, whereDatabase, wherePredicate) => {
//    // asynchronously fetch values if status isn't ready (= values are not in cache)
//    db.listStatus.get(whereTag).then(listStatus => {
//       if (listStatus?.status !== 'ready') {
//          app.service('user').findMany({
//             where: whereDatabase,
//             include: {
//                groups: true,
//             },
//          }).then(values => {
//             const promiseList = values.map(value => db.values.put(value))
//             return Promise.all(promiseList)
//          }).then(() => {
//             db.listStatus.put({ whereTag, status: 'ready' })
//          }).catch(err => {
//             console.log('err', err)
//          })
//       }
//    })
//    return liveQuery(() => db.values.filter(wherePredicate).toArray())
// }


// export const createEmptyUser = async (uid) => {
//    const data = { uid }
//    // optimistic update of cache
//    db.values.put(data)
//    // execute on server
//    const user = await app.service('user').create({ data })
//    return user
// }

export const getUserObservable = (uid) => {
   // return observable
   return liveQuery(() => db.values.filter(user => !user.deleted_ && user.uid === uid).first())
}

export const getUserListObservable = () => {
   // return observable
   return liveQuery(() => db.values.filter(user => !user.deleted_).toArray())
}

export async function addUser(data) {
   const uid = uuidv4()
   console.log('create user', uid)
   // enlarge perimeter
   addSynchroWhere({ uid }, db.whereList)
   // optimistic update
   await db.values.add({ uid, ...data })
   // perform request on backend (if connection is active)
   await app.service('user', { volatile: true }).create({ data: { uid, ...data } })
}

export const updateUser = async (uid, data) => {
   // optimistic update of cache
   db.values.update(uid, data)
   // execute on server
   const user = await app.service('user', { volatile: true }).update({
      where: { uid },
      data,
      include: {
         user_group_relations: true,
         user_tab_relations: true,
      },
   })
   return user
}

// export const updateUserGroups = async (id, newGroups) => {
//    // optimistic update of cache
//    const groups = newGroups.map(id => ({ id }))
//    db.values.update(id, { groups })
//    // execute on server
//    const user = await app.service('user', { volatile: true }).update({
//       where: { id },
//       data: {
//          groups: {
//             // connect, disconnect, set: https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries#disconnect-all-related-records
//             set: groups,
//          }
//       },
//       include: {
//          groups: true,
//       },
//    })
//    return user
// }

export const updateUserTabs = async (id, tabs) => {
   // optimistic update of cache
   db.values.update(id, { tabs })
   // execute on server
   const user = await app.service('user', { volatile: true }).update({
      where: { id },
      data: {
         tabs
      },
      include: {
         groups: true,
      },
   })
   return user
}

export const removeUser = async (uid) => {
   // optimistic update of cache
   db.values.delete(uid)
   // execute on server
   await app.service('user', { volatile: true }).delete({ where: { uid }})
}

export function getFullname(user) {
   if (!user) return ''
   if (user.firstname && user.lastname) return user.lastname + ' ' + user.firstname
   return user.lastname || user.firstname
}


/////////////          SYNCHRONIZATION          /////////////

export async function selectValues(where) {
   if (addSynchroWhere(where, db.whereList)) {
      await synchronize(app, 'user', db.values, where, offlineDate.value)
   }
   const predicate = wherePredicate(where)
   const values = db.values.filter(value => !value.deleted_ && predicate(value)).toArray()
   return values
}

export function selectObservable(where) {
   // start synchronization if `where` is new
   if (addSynchroWhere(where, db.whereList)) {
      synchronize(app, 'user', db.values, where, offlineDate.value).then(() => {
         console.log('synchronize user', where, 'ended')
      })
   }
   // return observable for `where` values
   const predicate = wherePredicate(where)
   return liveQuery(() => db.values.filter(value => !value.deleted_ && predicate(value)).toArray())
}

// export const getWhereListObservable = () => {
//    return liveQuery(() => db.whereList.toArray())
// }


// export const synchronizePerimeter = async () => {
//    await synchronizeAll(app, 'user', db.values, offlineDate.value, db.whereList)
// }
