
import useModel from '/src/use/useModel'

export function useUserSHDLTestRelation() {
   return useModel(import.meta.env.VITE_APP_USER_SHDLTEST_RELATION_IDB, 'user_shdltest_relation', ['user_uid', 'shdl_test_uid', 'date', 'success', 'evaluation'])
}
