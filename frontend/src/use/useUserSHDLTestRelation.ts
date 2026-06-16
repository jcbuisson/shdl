
let modelInstance = null

export function useUserSHDLTestRelation(app) {
   if (!modelInstance) {
      modelInstance = app.createOfflineModel('user_test_relation', [
         'user_uid',
         'test_uid',
         'first_try_date',
         'last_try_date',
         'success_date',
         'update_count',
         'evaluation',
         'last_module_name',
      ])
   }
   return modelInstance
}
