import Dexie from "dexie"
import { liveQuery } from "dexie"
// import { v4 as uuidv4 } from 'uuid'
import { uid as uid16 } from 'uid'

import { getRelationListFromUser as getTabRelationListFromUser, remove as deleteTabRelation } from '/src/use/useUserTabRelation'
import { getRelationListFromUser as getGroupRelationListFromUser, remove as deleteGroupRelation } from '/src/use/useUserGroupRelation'
import { wherePredicate, synchronize, addSynchroWhere, removeSynchroWhere } from '/src/lib/synchronize.js'
import { app, offlineDate } from '/src/client-app.js'

export const db = new Dexie("userDatabaseSHDL")

db.version(1).stores({
   whereList: "id++, where",
   values: "uid, createdAt, updatedAt, email, firstname, lastname, deleted_"
})

export const reset = async () => {
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

// return an Observable
export function findMany(where) {
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

export async function create(data) {
   const uid = uid16(16)
   // enlarge perimeter
   addSynchroWhere({ uid }, db.whereList)
   // optimistic update
   const user = await db.values.add({ uid, ...data })
   // perform request on backend (if connection is active)
   await app.service('user', { volatile: true }).create({ data: { uid, ...data } })
   return user
}

export const update = async (uid, data) => {
   // optimistic update of cache
   const user = await db.values.update(uid, data)
   // execute on server
   await app.service('user', { volatile: true }).update({ where: { uid }, data })
   return user
}

// special case of signin: create/update record of user
export const put = async (value) => {
   // put: create (if new) or update
   return await db.values.put(value)
}

export const remove = async (uid) => {
   // stop synchronizing on this perimeter
   removeSynchroWhere({ uid }, db.whereList)
   // optimistic update of cache
   // cascade-delete user-tab relations
   const userTabRelations = await getTabRelationListFromUser(uid)
   await Promise.all(userTabRelations.map(relation => deleteTabRelation(relation)))
   // cascade-delete user-group relations
   const userGroupRelations = await getGroupRelationListFromUser(uid)
   await Promise.all(userGroupRelations.map(relation => deleteGroupRelation(relation)))
   // delete user
   await db.values.update(uid, { deleted_: true })
   // execute on server (cascade-delete is done by rdbms)
   await app.service('user', { volatile: true }).delete({ where: { uid }})
}


export function getFullname(user) {
   if (!user) return ''
   if (user.firstname && user.lastname) return user.lastname + ' ' + user.firstname
   return user.lastname || user.firstname
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

// export async function selectValues(where) {
//    // start synchronization if `where` is new
//    if (addSynchroWhere(where, db.whereList)) {
//       await synchronize(app, 'user', db.values, where, offlineDate.value)
//    }
//    const predicate = wherePredicate(where)
//    const values = db.values.filter(value => !value.deleted_ && predicate(value)).toArray()
//    return values
// }

// export const synchronizePerimeter = async () => {
//    await synchronizeAll(app, 'user', db.values, offlineDate.value, db.whereList)
// }
