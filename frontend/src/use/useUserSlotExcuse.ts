import { useSharedElectricModel } from './useSharedElectricModel'

let modelInstance = null

export function useUserSlotExcuse(app) {
   if (!modelInstance) {
      modelInstance = useSharedElectricModel(app, 'user_slot_excuse')
   }
   return modelInstance
}
