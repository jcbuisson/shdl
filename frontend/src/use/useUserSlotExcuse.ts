
let modelInstance = null

export function useUserSlotExcuse(app) {
   if (!modelInstance) {
      modelInstance = app.createElectricModel('user_slot_excuse')
   }
   return modelInstance
}
