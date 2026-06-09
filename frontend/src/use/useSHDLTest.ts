
let modelInstance = null

export function useSHDLTest(app) {
   if (!modelInstance) {
      modelInstance = app.createOfflineModel('test', ['name'])
   }
   return modelInstance
}
