import Dexie from "dexie"
import { liveQuery } from "dexie"
// import { v4 as uuidv4 } from 'uuid'
import { uid as uid16 } from 'uid'

import { getRelationListFromUser, deleteRelation } from '/src/use/useUserTabRelation'
import { wherePredicate, synchronize, addSynchroWhere, removeSynchroWhere } from '/src/lib/synchronize.js'
import { app, offlineDate } from '/src/client-app.js'

export const db = new Dexie("userDatabaseSHDL")

db.version(1).stores({
   whereList: "id++, where",
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

export const getUserObservable = (uid) => {
   // return observable
   return liveQuery(() => db.values.filter(user => !user.deleted_ && user.uid === uid).first())
}

export const getUserListObservable = () => {
   // return observable
   return liveQuery(() => db.values.filter(user => !user.deleted_).toArray())
}

export async function addUser(data) {
   const uid = uid16(16)
   // enlarge perimeter
   addSynchroWhere({ uid }, db.whereList)
   // optimistic update
   await db.values.add({ uid, ...data })
   // perform request on backend (if connection is active)
   await app.service('user', { volatile: true }).create({ data: { uid, ...data } })
   return db.values.get(uid)
}

export const updateUser = async (uid, data) => {
   // optimistic update of cache
   db.values.update(uid, data)
   // execute on server
   await app.service('user', { volatile: true }).update({
      where: { uid },
      data,
      include: {
         user_group_relations: true,
         user_tab_relations: true,
      },
   })
   return db.values.get(uid)
}

// export const updateUserTabs = async (uid, newTabs) => {
//    // optimistic update of cache
//    db.values.update(uid, { groups })
//    // execute on server
//    const user = await app.service('user', { volatile: true }).update({
//       where: { uid },
//       data: {
//          tabs: {
//             // connect, disconnect, set: https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries#disconnect-all-related-records
//             set: newTabs,
//          }
//       },
//       include: {
//          tabs: true,
//       },
//    })
//    return user
// }

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

export const deleteUser = async (uid) => {
   // stop synchronizing on this perimeter
   removeSynchroWhere({ uid }, db.whereList)
   // optimistic update of cache
   // cascade-delete associated relations
   const relations = await getRelationListFromUser(uid)
   await Promise.all(relations.map(relation => deleteRelation(relation)))
   // delete user
   await db.values.update(uid, { deleted_: true })
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

// export const synchronizePerimeter = async () => {
//    await synchronizeAll(app, 'user', db.values, offlineDate.value, db.whereList)
// }
