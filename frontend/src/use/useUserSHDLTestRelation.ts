
let modelInstance = null

export function useUserSHDLTestRelation(app) {
   if (!modelInstance) {
      modelInstance = app.createOfflineModel('user_shdltest_relation', ['user_uid', 'shdl_test_uid', 'date', 'success', 'evaluation'])
   }
   return modelInstance
}
