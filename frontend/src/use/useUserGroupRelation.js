import Dexie from "dexie"
import { liveQuery } from "dexie"
import { uid as uid16 } from 'uid'

import { wherePredicate, synchronize, addSynchroWhere, removeSynchroWhere } from '/src/lib/synchronize.js'
import { app, offlineDate } from '/src/client-app.js'

export const db = new Dexie("userGroupRelationDatabaseSHDL")

db.version(1).stores({
   whereList: "id++, where",
   values: "uid, createdAt, updatedAt, user_uid, group_uid, deleted_"
})

export const reset = async () => {
   await db.whereList.clear()
   await db.values.clear()
}

app.service('user_group_relation').on('create', async value => {
   console.log('USER_GROUP_RELATION EVENT created', value)
   await db.values.put(value)
})

app.service('user_group_relation').on('update', async value => {
   console.log('USER_GROUP_RELATION EVENT update', value)
   await db.values.put(value)
})

app.service('user_group_relation').on('delete', async value => {
   console.log('USER_GROUP_RELATION EVENT delete', value)
   await db.values.delete(value.uid)
})


/////////////              METHODS              /////////////

// return an Observable
export function findMany(where) {
   // start synchronization if `where` is new
   if (addSynchroWhere(where, db.whereList)) {
      synchronize(app, 'user_group_relation', db.values, where, offlineDate.value).then(() => {
         console.log('synchronize user_group_relation', where, 'ended')
      })
   }
   // return observable for `where` values
   const predicate = wherePredicate(where)
   return liveQuery(() => db.values.filter(value => !value.deleted_ && predicate(value)).toArray())
}

export async function updateUserGroups(user_uid, newGroupUIDs) {
   // enlarge perimeter
   addSynchroWhere({ user_uid }, db.whereList)

   // optimistic update of cache
   const currentRelations = await db.values.filter(value => !value.deleted_ && value.user_uid === user_uid).toArray()
   const currentGroupUIDs = currentRelations.map(relation => relation.group_uid)
   const toAdd = newGroupUIDs.filter(group_uid => !currentGroupUIDs.includes(group_uid))
   const toRemove = currentGroupUIDs.filter(group_uid => !newGroupUIDs.includes(group_uid))
   for (const group_uid of toAdd) {
      const uid = uid16(16)
      await db.values.add({ uid, user_uid, group_uid })
   }
   for (const group_uid of toRemove) {
      const uid = currentRelations.find(relation => relation.group_uid === group_uid).uid
      await db.values.update(uid, { deleted_: true })
   }
   
   // execute on server
   for (const group_uid of toAdd) {
      const relation = await db.values.filter(value => value.user_uid === user_uid && value.group_uid === group_uid).first()
      await app.service('user_group_relation', { volatile: true }).create({ data: { uid: relation.uid, user_uid, group_uid }})
   }
   for (const group_uid of toRemove) {
      const relation = await db.values.filter(value => value.user_uid === user_uid && value.group_uid === group_uid).first()
      await app.service('user_group_relation', { volatile: true }).delete({ where: { uid: relation.uid }})
   }
}

export async function remove(uid) {
   // // stop synchronizing on this perimeter
   removeSynchroWhere({ uid }, db.whereList)
   // optimistic update
   await db.values.update(uid, { deleted_: true })
   // perform request on backend (if connection is active)
   await app.service('user_group_relation', { volatile: true }).delete({ where: { uid }})
}


export const getRelationListFromUser = async (user_uid) => {
   return await db.values.filter(relation => !relation.deleted_ && relation.user_uid === user_uid).toArray()
}
