
let modelInstance = null

export function useGroupSlotSHDLTestRelation(app) {
   if (!modelInstance) {
      modelInstance = app.createElectricModel('groupslot_test_relation')
   }

   /////////////          UTILITY          /////////////

   async function groupDifference(group_slot_uid, newTestUIDs) {
      const toAddTestUIDs = []
      const toRemoveRelationUIDs = []
      // collect active group_slot <-> test relations with `group_slot_uid`
      const currentRelations = await modelInstance.findMany({ group_slot_uid })
      // relations to add
      for (const test_uid of newTestUIDs) {
         if (!currentRelations.some(relation => relation.test_uid === test_uid)) {
            toAddTestUIDs.push(test_uid)
         }
      }
      // relations to remove
      for (const relation of currentRelations) {
         if (!newTestUIDs.includes(relation.test_uid)) {
            toRemoveRelationUIDs.push(relation.uid)
         }
      }
      return [toAddTestUIDs, toRemoveRelationUIDs]
   }

   return { ...modelInstance, groupDifference }


}
