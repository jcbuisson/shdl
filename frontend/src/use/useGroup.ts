import { useSharedElectricModel } from './useSharedElectricModel'

let modelInstance = null

export function useGroup(app) {
   if (!modelInstance) {
      modelInstance = useSharedElectricModel(app, 'group')
   }
   return modelInstance
}
