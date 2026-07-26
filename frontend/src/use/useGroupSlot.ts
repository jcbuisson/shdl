import { useSharedElectricModel } from './useSharedElectricModel'

let modelInstance = null

export function useGroupSlot(app) {
   if (!modelInstance) {
      modelInstance = useSharedElectricModel(app, 'group_slot')
   }
   return modelInstance
}
