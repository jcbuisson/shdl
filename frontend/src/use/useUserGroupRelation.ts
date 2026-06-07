
let modelInstance = null

export function useUserGroupRelation(app) {
   if (!modelInstance) {
      modelInstance = app.createOfflineModel('user_group_relation', ['user_uid', 'group_uid'])
   }

   /////////////          UTILITY          /////////////

   async function groupDifference(user_uid, newGroupUIDs) {
      const db = modelInstance.db

      const toAddGroupUIDs = []
      const toRemoveRelationUIDs = []
      // collect active user-group relations with `user_uid`
      const allUserRelations = await db.values.filter(value => value.user_uid === user_uid).toArray()
      const currentUserRelations = []
      for (const relation of allUserRelations) {
         const metadata = await db.metadata.get(relation.uid)
         if (metadata.deleted_at) continue
         currentUserRelations.push(relation)
      }
      // relations to add
      for (const group_uid of newGroupUIDs) {
         if (!currentUserRelations.some(relation => relation.group_uid === group_uid)) {
            toAddGroupUIDs.push(group_uid)
         }
      }
      // relations to remove
      for (const relation of currentUserRelations) {
         if (!newGroupUIDs.includes(relation.group_uid)) {
            toRemoveRelationUIDs.push(relation.uid)
         }
      }
      return [toAddGroupUIDs, toRemoveRelationUIDs]
   }

   return { ...modelInstance, groupDifference }

}
