
let modelInstance = null

export function useGroupSlot(app) {
   if (!modelInstance) {
      modelInstance = app.createOfflineModel('group_slot', ['group_uid', 'name', 'start', 'end'])
   }
   return modelInstance
}
