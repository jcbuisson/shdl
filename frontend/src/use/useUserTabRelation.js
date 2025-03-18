import Dexie from "dexie"
import { liveQuery } from "dexie"
// import { v4 as uuidv4 } from 'uuid'
import { uid as uid16 } from 'uid'

import { wherePredicate, synchronize, addSynchroWhere, removeSynchroWhere } from '/src/lib/synchronize.js'
import { app, offlineDate } from '/src/client-app.js'

export const db = new Dexie("userTabRelationDatabaseSHDL")

db.version(1).stores({
   whereList: "id++, where",
   values: "uid, createdAt, updatedAt, user_uid, tab, deleted_"
})

export const resetUseUserTabRelation = async () => {
   await db.whereList.clear()
   await db.values.clear()
}

app.service('user_tab_relation').on('create', async value => {
   console.log('USER_TAB_RELATION EVENT created', value)
   await db.values.put(value)
})

app.service('user_tab_relation').on('update', async value => {
   console.log('USER_TAB_RELATION EVENT update', value)
   await db.values.put(value)
})

app.service('user_tab_relation').on('delete', async value => {
   console.log('USER_TAB_RELATION EVENT delete', value)
   await db.values.delete(value.uid)
})


/////////////              METHODS              /////////////

export const getRelationListFromUser = async (user_uid) => {
   return await db.values.filter(relation => !relation.deleted_ && relation.user_uid === user_uid).toArray()
}

export async function updateUserTabs(user_uid, newTabs) {
   // enlarge perimeter
   addSynchroWhere({ user_uid }, db.whereList)

   // optimistic update of cache
   const currentRelations = await db.values.filter(value => !value.deleted_ && value.user_uid === user_uid).toArray()
   const currentTabs = currentRelations.map(relation => relation.tab)
   const toAdd = newTabs.filter(tab => !currentTabs.includes(tab))
   const toRemove = currentTabs.filter(tab => !newTabs.includes(tab))
   for (const tab of toAdd) {
      const uid = uid16(16)
      const x = await db.values.add({ uid, user_uid, tab })
      console.log('added', x)
   }
   for (const tab of toRemove) {
      const uid = currentRelations.find(relation => relation.tab === tab).uid
      await db.values.update(uid, { deleted_: true })
   }
   
   // execute on server
   for (const tab of toAdd) {
      const relation = await db.values.filter(value => value.user_uid === user_uid && value.tab === tab).first()
      await app.service('user_tab_relation', { volatile: true }).create({ data: { uid: relation.uid, user_uid, tab }})
   }
   for (const tab of toRemove) {
      const relation = await db.values.filter(value => value.user_uid === user_uid && value.tab === tab).first()
      await app.service('user_tab_relation', { volatile: true }).delete({ where: { uid: relation.uid }})
   }
}

export async function deleteRelation(uid) {
   // // stop synchronizing on this perimeter
   removeSynchroWhere({ uid }, db.whereList)
   // optimistic update
   await db.values.update(uid, { deleted_: true })
   // perform request on backend (if connection is active)
   await app.service('user_tab_relation', { volatile: true }).delete({ where: { uid }})
}


/////////////          SYNCHRONIZATION          /////////////

export async function selectValues(where) {
   if (addSynchroWhere(where, db.whereList)) {
      await synchronize(app, 'user_tab_relation', db.values, where, offlineDate.value)
   }
   const predicate = wherePredicate(where)
   const values = db.values.filter(value => !value.deleted_ && predicate(value)).toArray()
   return values
}

export function selectObservable(where) {
   // start synchronization if `where` is new
   if (addSynchroWhere(where, db.whereList)) {
      synchronize(app, 'user_tab_relation', db.values, where, offlineDate.value).then(() => {
         console.log('synchronize user_tab_relation', where, 'ended')
      })
   }
   // return observable for `where` values
   const predicate = wherePredicate(where)
   return liveQuery(() => db.values.filter(value => !value.deleted_ && predicate(value)).toArray())
}
