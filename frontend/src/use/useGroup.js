import Dexie from "dexie"
import { liveQuery } from "dexie"
import { uid as uid16 } from 'uid'

import { wherePredicate, synchronize, addSynchroWhere, removeSynchroWhere, synchronizeModelWhereList } from '/src/lib/synchronize.js'
import { app, isConnected, disconnectedDate } from '/src/client-app.js'

export const db = new Dexie("groupDatabaseSHDL")

db.version(1).stores({
   whereList: "sortedjson, where",
   values: "uid, created_at, updated_at, name, deleted_"
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


/////////////          CRUD METHODS WITH SYNC          /////////////

// return an Observable
export async function findMany(where) {
   const isNew = await addSynchroWhere(where, db.whereList)
   // run synchronization if connected and if `where` is new
   if (isNew && isConnected.value) {
      synchronize(app, 'group', db.values, where, disconnectedDate.value)
   }
   // return observable for `where` values
   const predicate = wherePredicate(where)
   return liveQuery(() => db.values.filter(value => !value.deleted_ && predicate(value)).toArray())
}

export async function create(data) {
   const uid = uid16(16)
   // enlarge perimeter
   await addSynchroWhere({ uid }, db.whereList)
   // optimistic update
   const value = await db.values.add({ uid, ...data, created_at: new Date(), updated_at: new Date() })
   // execute on server, asynchronously, if connection is active
   if (isConnected.value) {
      app.service('user').create({ data: { uid, ...data } })
   }
   return value
}

export const update = async (uid, data) => {
   // optimistic update of cache
   const value = await db.values.update(uid, {...data, updated_at: new Date()})
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
   // cascade-delete user-group relations
   const userGroupRelations = await getGroupRelationListOfUser(uid)
   await Promise.all(userGroupRelations.map(relation => deleteGroupRelation(relation)))
   // delete group
   await db.values.update(uid, { deleted_: true })
   // execute on server, asynchronously, if connection is active (cascade-delete is done by rdbms)
   if (isConnected.value) {
      app.service('group').delete({ where: { uid }})
   }
}

// app.addConnectListener(async () => {
//    await synchronizeWhereList(app, 'group', db.values, disconnectedDate.value, db.whereList)
// })

export async function synchronizeWhereList() {
   await synchronizeModelWhereList(app, 'group', db.values, disconnectedDate.value, db.whereList)
}
