
import { useModel } from '/src/use/useModel.ts';

// Create singleton model instance
let modelInstance = null


export function useUserTabRelation(app) {
   // Return existing instance if already created
   if (!modelInstance) {
      const { createModel } = useModel(app);
      modelInstance = createModel(import.meta.env.VITE_APP_USER_TAB_RELATION_IDB, 'user_tab_relation', ['user_uid', 'tab'])
   }
   
   /////////////          UTILITY          /////////////

   async function tabDifference(user_uid, newTabs) {
      const db = modelInstance.db

      const toAddTabs = []
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
      for (const tab of newTabs) {
         if (!currentUserRelations.some(relation => relation.tab === tab)) {
            toAddTabs.push(tab)
         }
      }
      // relations to remove
      for (const relation of currentUserRelations) {
         if (!newTabs.includes(relation.tab)) {
            toRemoveRelationUIDs.push(relation.uid)
         }
      }
      return [toAddTabs, toRemoveRelationUIDs]
   }

   return { ...modelInstance, tabDifference }
}


