
let modelInstance = null

export function useUserSHDLTestRelation(app) {
   if (!modelInstance) {
      modelInstance = app.createOfflineModel('user_test_relation', ['user_uid', 'test_uid', 'date', 'success', 'evaluation'])
   }
   return modelInstance
}
