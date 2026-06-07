
let modelInstance = null

export function useUserSlotExcuse(app) {
   if (!modelInstance) {
      modelInstance = app.createOfflineModel('user_slot_excuse', ['user_uid', 'group_slot_uid'])
   }
   return modelInstance
}
