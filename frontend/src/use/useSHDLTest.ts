
let modelInstance = null

export function useSHDLTest(app) {
   if (!modelInstance) {
      modelInstance = app.createOfflineModel('shdl_test', ['name'])
   }
   return modelInstance
}
