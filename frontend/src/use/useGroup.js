import Dexie from "dexie"
import { liveQuery } from "dexie"
import { uid as uid16 } from 'uid'
import { firstValueFrom } from 'rxjs'

import { getMany as getManyUserGroupRelation, remove as removeGroupRelation } from '/src/use/useUserGroupRelation'
import { wherePredicate, synchronize, addSynchroWhere, removeSynchroWhere, synchronizeModelWhereList } from '/src/lib/synchronize.js'
import { app, isConnected, disconnectedDate } from '/src/client-app.js'

export const db = new Dexie("groupDatabaseSHDL")

db.version(1).stores({
   whereList: "sortedjson, where",
   values: "uid, created_at, updated_at, deleted_at, name"
})

export const reset = async () => {
   await db.whereList.clear()
   await db.values.clear()
}

/////////////          PUB / SUB          /////////////

app.service('group').on('create', async group => {
   console.log('GROUP EVENT created', group)
   await db.values.put(group)
})

app.service('group').on('update', async group => {
   console.log('GROUP EVENT update', group)
   await db.values.put(group)
})

app.service('group').on('delete', async group => {
   console.log('GROUP EVENT delete', group)
   await db.values.delete(group.id)
})

/////////////          CACHE METHODS          /////////////

export async function get(uid) {
   return await db.values.get(uid)
}

export async function getMany(where) {
   const predicate = wherePredicate(where)
   return await db.values.filter(value => !value.deleted_at && predicate(value)).toArray()
}

/////////////          CRUD METHODS WITH SYNC          /////////////

// return an Observable
export async function findMany$(where) {
   const isNew = await addSynchroWhere(where, db.whereList)
   // run synchronization if connected and if `where` is new
   if (isNew && isConnected.value) {
      synchronize(app, 'group', db.values, where, disconnectedDate.value)
   }
   // return observable for `where` values
   const predicate = wherePredicate(where)
   return liveQuery(() => db.values.filter(value => !value.deleted_at && predicate(value)).toArray())
}

export async function create(data) {
   const uid = uid16(16)
   // enlarge perimeter
   await addSynchroWhere({ uid }, db.whereList)
   // optimistic update
   await db.values.add({ uid, ...data, created_at: new Date(), updated_at: new Date() })
   // execute on server, asynchronously, if connection is active
   if (isConnected.value) {
      app.service('group').create({ data: { uid, ...data } })
   }
   return await db.values.get(uid)
}

export const update = async (uid, data) => {
   // optimistic update of cache
   const value = await db.values.update(uid, {...data, updated_at: new Date()})
   // execute on server, asynchronously, if connection is active
   if (isConnected.value) {
      app.service('group').update({ where: { uid }, data })
   }
   return await db.values.get(uid)
}

export const remove = async (uid) => {
   // stop synchronizing on this perimeter
   removeSynchroWhere({ uid }, db.whereList)
   const deleted_at = new Date()

   // (soft)remove relations to users in cache, and in database if connected
   const userGroupRelations = await getManyUserGroupRelation({ group_uid: uid })
   await Promise.all(userGroupRelations.map(relation => removeGroupRelation(relation)))

   // (soft)remove group in cache
   await db.values.update(uid, { deleted_at })
   // and in database, if connected
   if (isConnected.value) {
      app.service('group').update({
         where: { uid },
         data: { deleted_at }
      })
   }
}


export async function synchronizeWhere(where) {
   const isNew = await addSynchroWhere(where, db.whereList)
   // run synchronization if connected and if `where` is new
   if (isNew && isConnected.value) {
      await synchronize(app, 'group', db.values, where, disconnectedDate.value)
   }
}

export async function synchronizeAll() {
   await synchronizeModelWhereList(app, 'group', db.values, disconnectedDate.value, db.whereList)
}
