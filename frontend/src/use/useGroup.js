import Dexie from "dexie"
import { liveQuery } from "dexie"
// import { v4 as uuidv4 } from 'uuid'
import { uid as uid16 } from 'uid'

// import { getGroupRelationsFromUser, deleteRelation } from '/src/use/useUserGroupRelation'
import { wherePredicate, synchronize, addSynchroWhere, removeSynchroWhere } from '/src/lib/synchronize.js'
import { app, offlineDate } from '/src/client-app.js'

export const db = new Dexie("groupDatabaseSHDL")

db.version(1).stores({
   whereList: "id++, where",
   values: "uid, createdAt, updatedAt, name, deleted_"
})

export const resetUseGroup = async () => {
   await db.whereList.clear()
   await db.values.clear()
}

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


export const getGroupPromise = async (id) => {
   let value = await db.values.get(id)
   if (value) return value
   value = await app.service('group').findUnique({ where: { id }})
   await db.values.put(value)
   return value
}


export async function addGroup(data) {
   const uid = uid16(16)
   console.log('create user', uid)
   // enlarge perimeter
   addSynchroWhere({ uid }, db.whereList)
   // optimistic update
   await db.values.add({ uid, ...data })
   // perform request on backend (if connection is active)
   await app.service('group', { volatile: true }).create({ data: { uid, ...data } })
}


export const updateGroup = async (uid, data) => {
   // optimistic update of cache
   db.values.update(uid, data)
   // execute on server
   const group = await app.service('group', { volatile: true }).update({
      where: { uid },
      data,
   })
   return group
}

export const deleteGroup = async (uid) => {
   // stop synchronizing on this perimeter
   removeSynchroWhere({ uid }, db.whereList)
   // optimistic update of cache
   // // cascade-delete user-group relations
   // const userGroupRelations = await getGroupRelationListFromUser(uid)
   // await Promise.all(userGroupRelations.map(relation => deleteGroupRelation(relation)))
   // delete group
   await db.values.update(uid, { deleted_: true })
   // execute on server
   await app.service('group', { volatile: true }).delete({ where: { uid }})
}


/////////////          SYNCHRONIZATION          /////////////

export async function selectValues(where) {
   if (addSynchroWhere(where, db.whereList)) {
      await synchronize(app, 'group', db.values, where, offlineDate.value)
   }
   const predicate = wherePredicate(where)
   const values = db.values.filter(value => !value.deleted_ && predicate(value)).toArray()
   return values
}

export function findMany(where) {
   // start synchronization if `where` is new
   if (addSynchroWhere(where, db.whereList)) {
      synchronize(app, 'group', db.values, where, offlineDate.value).then(() => {
         console.log('synchronize group', where, 'ended')
      })
   }
   // return observable for `where` values
   const predicate = wherePredicate(where)
   return liveQuery(() => db.values.filter(value => !value.deleted_ && predicate(value)).toArray())
}
