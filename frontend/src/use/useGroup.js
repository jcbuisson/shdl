import Dexie from "dexie"
import { liveQuery } from "dexie"
import { uid as uid16 } from 'uid'

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


export async function getFromCache(uid) {
   return await db.values.get(uid)
}

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
   return liveQuery(() => db.values.filter(value => !value.deleted_at && predicate(value)).toArray())
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
   const deleted_at = new Date()
   // optimistic update of cache
   // soft-delete associated user-group relations in cache
   const userGroupRelations = await getGroupRelationListOfUser(uid)
   await Promise.all(userGroupRelations.map(relation => deleteGroupRelation(relation)))
   // soft-delete group in cache
   await db.values.update(uid, { deleted_at })

   // soft-delete in database, if connected
   if (isConnected.value) {
      // soft-delete associated user-group relations in database
      for (const relation of userGroupRelations) {
         app.service('user_group_relation').update({
            where: { uid: relation.uid },
            data: { deleted_at }
         })
      }
      // soft-delete group in database
      app.service('group').update({
         where: { uid },
         data: { deleted_at }
      })
   }
}

// app.addConnectListener(async () => {
//    await synchronizeWhereList(app, 'group', db.values, disconnectedDate.value, db.whereList)
// })

export async function synchronizeWhereList() {
   await synchronizeModelWhereList(app, 'group', db.values, disconnectedDate.value, db.whereList)
}
