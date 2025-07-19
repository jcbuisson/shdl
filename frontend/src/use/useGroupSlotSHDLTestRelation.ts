
import useModel from '/src/use/useModel'


export function useGroupSlotSHDLTestRelation() {

   return useModel(import.meta.env.VITE_APP_GROUPSLOT_SHDLTEST_RELATION_IDB, 'user_groupslot_shdltest_relation', ['group_slot_uid', 'shdl_test_uid'])

}
