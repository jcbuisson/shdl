
import useModel from '/src/use/useModel'


export function useGroupSlotSHDLTestRelation() {

   const model = useModel(import.meta.env.VITE_APP_GROUPSLOT_SHDLTEST_RELATION_IDB, 'groupslot_shdltest_relation', ['group_slot_uid', 'shdl_test_uid'])

   /////////////          UTILITY          /////////////

   async function groupDifference(group_slot_uid, newTestUIDs) {
      const db = model.db

      const toAddTestUIDs = []
      const toRemoveRelationUIDs = []
      // collect active group_slot <-> shdl_test relations with `group_slot_uid`
      const currentRelations = []
      const allRelations = await db.values.filter(value => value.group_slot_uid === group_slot_uid).toArray()
      for (const relation of allRelations) {
         const metadata = await db.metadata.get(relation.uid)
         if (metadata.deleted_at) continue
         currentRelations.push(relation)
      }
      // relations to add
      for (const shdl_test_uid of newTestUIDs) {
         if (!currentRelations.some(relation => relation.shdl_test_uid === shdl_test_uid)) {
            toAddTestUIDs.push(shdl_test_uid)
         }
      }
      // relations to remove
      for (const relation of currentRelations) {
         if (!newTestUIDs.includes(relation.shdl_test_uid)) {
            toRemoveRelationUIDs.push(relation.uid)
         }
      }
      return [toAddTestUIDs, toRemoveRelationUIDs]
   }

   return { ...model, groupDifference }


}
