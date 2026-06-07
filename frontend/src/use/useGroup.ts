
let modelInstance = null

export function useGroup(app) {
   if (!modelInstance) {
      modelInstance = app.createOfflineModel('group', ['name'])
   }
   return modelInstance
}
