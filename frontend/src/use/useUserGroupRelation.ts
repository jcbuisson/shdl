import { useSharedElectricModel } from './useSharedElectricModel'

let modelInstance = null

export function useUserGroupRelation(app) {
   if (!modelInstance) {
      modelInstance = useSharedElectricModel(app, 'user_group_relation')
   }

   /////////////          UTILITY          /////////////

   async function groupDifference(user_uid, newGroupUIDs) {
      const toAddGroupUIDs = []
      const toRemoveRelationUIDs = []
      const currentUserRelations = await modelInstance.findMany({ user_uid })

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
