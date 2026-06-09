
let modelInstance = null

export function useGroupSlotSHDLTestRelation(app) {
   if (!modelInstance) {
      modelInstance = app.createOfflineModel('groupslot_test_relation', ['group_slot_uid', 'test_uid'])
   }

   /////////////          UTILITY          /////////////

   async function groupDifference(group_slot_uid, newTestUIDs) {
      const db = modelInstance.db

      const toAddTestUIDs = []
      const toRemoveRelationUIDs = []
      // collect active group_slot <-> test relations with `group_slot_uid`
      const currentRelations = []
      const allRelations = await db.values.filter(value => value.group_slot_uid === group_slot_uid).toArray()
      for (const relation of allRelations) {
         const metadata = await db.metadata.get(relation.uid)
         if (metadata.deleted_at) continue
         currentRelations.push(relation)
      }
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
