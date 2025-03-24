import Dexie from "dexie"
import { liveQuery } from "dexie"
import { uid as uid16 } from 'uid'

import { wherePredicate, synchronize, addSynchroWhere, removeSynchroWhere, synchronizeModelWhereList } from '/src/lib/synchronize.js'
import { app, isConnected, disconnectedDate } from '/src/client-app.js'

export const db = new Dexie("userTabRelationDatabaseSHDL")

db.version(1).stores({
   whereList: "id++, where",
   values: "uid, created_at, updated_at, user_uid, tab, deleted_"
})

export const reset = async () => {
   await db.whereList.clear()
   await db.values.clear()
}

/////////////          PUB / SUB          /////////////

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


/////////////          CRUD METHODS WITH SYNC          /////////////

// return an Observable
export async function findMany(where) {
   const isNew = await addSynchroWhere(where, db.whereList)
   // run synchronization if connected and if `where` is new
   if (isNew && isConnected.value) {
      synchronize(app, 'user_tab_relation', db.values, where, disconnectedDate.value)
   }
   // return observable for `where` values
   const predicate = wherePredicate(where)
   return liveQuery(() => db.values.filter(value => !value.deleted_ && predicate(value)).toArray())
}

export async function updateUserTabs(user_uid, newTabs) {
   // enlarge perimeter
   await addSynchroWhere({ user_uid }, db.whereList)

   // optimistic update of cache
   const currentRelations = await db.values.filter(value => !value.deleted_ && value.user_uid === user_uid).toArray()
   const currentTabs = currentRelations.map(relation => relation.tab)
   const toAdd = newTabs.filter(tab => !currentTabs.includes(tab))
   const toRemove = currentTabs.filter(tab => !newTabs.includes(tab))
   for (const tab of toAdd) {
      const uid = uid16(16)
      const now = new Date()
      await db.values.add({ uid, user_uid, tab, created_at: now, updated_at: now })
   }
   for (const tab of toRemove) {
      const uid = currentRelations.find(relation => relation.tab === tab).uid
      await db.values.update(uid, { deleted_: true })
   }
   
   // execute on server, asynchronously, if connection is active
   for (const tab of toAdd) {
      const relation = await db.values.filter(value => value.user_uid === user_uid && value.tab === tab).first()
      if (isConnected.value) app.service('user_tab_relation').create({ data: { uid: relation.uid, user_uid, tab }})
   }
   for (const tab of toRemove) {
      const relation = await db.values.filter(value => value.user_uid === user_uid && value.tab === tab).first()
      if (isConnected.value) app.service('user_tab_relation').delete({ where: { uid: relation.uid }})
   }
}

export async function remove(uid) {
   // stop synchronizing on this perimeter
   removeSynchroWhere({ uid }, db.whereList)
   // optimistic update
   await db.values.update(uid, { deleted_: true })
   // execute on server, asynchronously, if connection is active
   if (isConnected.value) {
      app.service('user_tab_relation').delete({ where: { uid }})
   }
}

// app.addConnectListener(async () => {
//    await synchronizeWhereList(app, 'user_tab_relation', db.values, disconnectedDate.value, db.whereList)
// })

export async function synchronizeWhereList() {
   await synchronizeModelWhereList(app, 'user_tab_relation', db.values, disconnectedDate.value, db.whereList)
}


export const getRelationListOfUser = async (user_uid) => {
   return await db.values.filter(relation => !relation.deleted_ && relation.user_uid === user_uid).toArray()
}
