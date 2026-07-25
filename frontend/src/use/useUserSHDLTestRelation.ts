
let modelInstance = null

export function useUserSHDLTestRelation(app) {
   if (!modelInstance) {
      modelInstance = app.createElectricModel('user_test_relation')
   }
   return modelInstance
}
