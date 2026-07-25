
let modelInstance = null

export function useUserDocument(app) {
   if (!modelInstance) {
      modelInstance = app.createElectricModel('user_document')
   }
   return modelInstance
}
