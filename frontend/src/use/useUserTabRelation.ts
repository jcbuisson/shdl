
let modelInstance = null


export function useUserTabRelation(app) {
   if (!modelInstance) {
      modelInstance = app.createElectricModel('user_tab_relation')
   }
   
   /////////////          UTILITY          /////////////

   async function tabDifference(user_uid, newTabs) {
      const toAddTabs = []
      const toRemoveRelationUIDs = []
      // collect active user-group relations with `user_uid`
      const currentUserRelations = await modelInstance.findMany({ user_uid })
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

