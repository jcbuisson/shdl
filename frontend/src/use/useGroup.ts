
let modelInstance = null

export function useGroup(app) {
   if (!modelInstance) {
      modelInstance = app.createElectricModel('group')
   }
   return modelInstance
}
