
let modelInstance = null

export function useSHDLTest(app) {
   if (!modelInstance) {
      modelInstance = app.createElectricModel('test')
   }
   return modelInstance
}
