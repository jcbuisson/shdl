import Dexie from "dexie"
import { liveQuery } from "dexie"
import { uid as uid16 } from 'uid'

import { getRelationListOfUser as getTabRelationListOfUser, remove as removeTabRelation } from '/src/use/useUserTabRelation'
import { getRelationListOfUser as getGroupRelationListOfUser, remove as removeGroupRelation } from '/src/use/useUserGroupRelation'
import { wherePredicate, synchronize, addSynchroWhere, removeSynchroWhere, synchronizeWhereList } from '/src/lib/synchronize.js'
import { app, isConnected, disconnectedDate } from '/src/client-app.js'

export const db = new Dexie("userDatabaseSHDL")

db.version(1).stores({
   whereList: "id++, where",
   values: "uid, createdAt, updatedAt, email, firstname, lastname, deleted_"
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

// return an Observable
export function findMany(where) {
   const isNew = addSynchroWhere(where, db.whereList)
   // run synchronization if connected and if `where` is new
   if (isNew && isConnected.value) {
      synchronize(app, 'user', db.values, where, disconnectedDate.value)
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
   const value = await db.values.add({ uid, ...data, createdAt: new Date(), updatedAt: new Date() })
   // execute on server, asynchronously, if connection is active
   if (isConnected.value) {
      app.service('user').create({ data: { uid, ...data } })
   }
   return value
}

export const update = async (uid, data) => {
   // optimistic update of cache
   const value = await db.values.update(uid, {...data, updatedAt: new Date()})
   // execute on server, asynchronously, if connection is active
   if (isConnected.value) {
      app.service('user').update({ where: { uid }, data })
   }
   return value
}

export const remove = async (uid) => {
   // stop synchronizing on this perimeter
   removeSynchroWhere({ uid }, db.whereList)
   // optimistic update of cache
   // cascade-delete user-tab relations
   const userTabRelations = await getTabRelationListOfUser(uid)
   await Promise.all(userTabRelations.map(relation => removeTabRelation(relation)))
   // cascade-delete user-group relations
   const userGroupRelations = await getGroupRelationListOfUser(uid)
   await Promise.all(userGroupRelations.map(relation => removeGroupRelation(relation)))
   // delete user
   await db.values.update(uid, { deleted_: true })
   // execute on server (cascade-delete is done by rdbms)
   if (isConnected.value) {
      app.service('user').delete({ where: { uid }})
   }
}

app.addConnectListener(async () => {
   await synchronizeWhereList(app, 'user', db.values, disconnectedDate.value, db.whereList)
})

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
