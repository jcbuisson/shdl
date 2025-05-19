
import useModel from '/src/use/useModel'


/////////////          CRUD/SYNC METHODS          /////////////

const {
   db, reset,
   create, update, remove,
   addPerimeter,
   synchronizeAll,
} = useModel(import.meta.env.VITE_APP_USER_TAB_RELATION_IDB, 'user_tab_relation', ['user_uid', 'tab'])


/////////////          UTILITY          /////////////

async function updateUserTabs(user_uid, newTabs) {
   // ensure that all relations of `user_uid` are in cache
   await addPerimeter({ user_uid })

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

export {
   db, reset,
   create, update, remove,
   addPerimeter,
   synchronizeAll,

   updateUserTabs,
}
