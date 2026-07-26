import { useSharedElectricModel } from './useSharedElectricModel'

let modelInstance = null

export function useUserSHDLTestRelation(app) {
   if (!modelInstance) {
      modelInstance = useSharedElectricModel(app, 'user_test_relation')
   }
   return modelInstance
}
