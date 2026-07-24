
let modelInstance = null

export function useGroupSlot(app) {
   if (!modelInstance) {
      modelInstance = app.createElectricModel('group_slot')
   }
   return modelInstance
}
