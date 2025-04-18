import Dexie from "dexie"
import { liveQuery } from "dexie"
import { uid as uid16 } from 'uid'

import { getMany as getManyUserTabRelation, remove as removeTabRelation } from '/src/use/useUserTabRelation'
import { getMany as getManyUserGroupRelation, remove as removeGroupRelation } from '/src/use/useUserGroupRelation'
import { wherePredicate, synchronize, addSynchroWhere, removeSynchroWhere, synchronizeModelWhereList } from '/src/lib/synchronize.js'
import { app, isConnected, disconnectedDate } from '/src/client-app.js'

export const db = new Dexie("userDatabaseSHDL")

db.version(1).stores({
   whereList: "sortedjson, where",
   values: "uid, created_at, updated_at, deleted_at, email, firstname, lastname"
})

export const reset = async () => {
   await db.whereList.clear()
   await db.values.clear()
}


/////////////          PUB / SUB          /////////////

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


/////////////          CRUD METHODS WITH SYNC          /////////////

export async function getMany(where) {
   const predicate = wherePredicate(where)
   return await db.values.filter(value => !value.deleted_at && predicate(value)).toArray()
}

export async function getFirst(where) {
   const predicate = wherePredicate(where)
   return await db.values.filter(value => !value.deleted_at && predicate(value)).first()
}

// return an Observable
export async function findMany(where) {
   const isNew = await addSynchroWhere(where, db.whereList)
   // run synchronization if connected and if `where` is new
   if (isNew && isConnected.value) {
      synchronize(app, 'user', db.values, where, disconnectedDate.value)
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
      app.service('user').create({ data: { uid, ...data } })
   }
   return await db.values.get(uid)
}

export const update = async (uid, data) => {
   // optimistic update of cache
   await db.values.update(uid, { ...data, updated_at: new Date() })
   // execute on server, asynchronously, if connection is active
   if (isConnected.value) {
      app.service('user').update({ where: { uid }, data })
   }
   return await db.values.get(uid)
}

export const remove = async (uid) => {
   // stop synchronizing on this perimeter
   await removeSynchroWhere({ uid }, db.whereList)
   const deleted_at = new Date()

   // (soft)remove relations to groups in cache, and in database if connected
   const userGroupRelations = await getManyUserGroupRelation({ user_uid: uid })
   await Promise.all(userGroupRelations.map(relation => removeGroupRelation(relation)))
   // (soft)remove relations to tabs in cache, and in database if connected
   const userTabRelations = await getManyUserTabRelation({ user_uid: uid })
   await Promise.all(userTabRelations.map(relation => removeTabRelation(relation)))

   // (soft)remove user in cache
   await db.values.update(uid, { deleted_at })
   // and in database, if connected
   if (isConnected.value) {
      app.service('user').update({
         where: { uid },
         data: { deleted_at }
      })
   }
}


export async function synchronizeWhere(where) {
   const isNew = await addSynchroWhere(where, db.whereList)
   // run synchronization if connected and if `where` is new
   if (isNew && isConnected.value) {
      await synchronize(app, 'user', db.values, where, disconnectedDate.value)
   }
}

export async function synchronizeWhereList() {
   await synchronizeModelWhereList(app, 'user', db.values, disconnectedDate.value, db.whereList)
}

/////////////          UTILITIES          /////////////

// special case of signin: create/update record of user
export const put = async (value) => {
   // put: create (if new) or update
   return await db.values.put(value)
}

export function getFullname(user) {
   if (!user) return ''
   if (user.firstname && user.lastname) return user.lastname + ' ' + user.firstname
   return user.lastname || user.firstname
}
