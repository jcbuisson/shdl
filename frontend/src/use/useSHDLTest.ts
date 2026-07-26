import { useSharedElectricModel } from './useSharedElectricModel'

let modelInstance = null

export function useSHDLTest(app) {
   if (!modelInstance) {
      modelInstance = useSharedElectricModel(app, 'test')
   }
   return modelInstance
}
