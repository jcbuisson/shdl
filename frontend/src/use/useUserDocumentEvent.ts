
let modelInstance = null

export function useUserDocumentEvent(app) {
   if (!modelInstance) {
      modelInstance = app.createElectricModel('user_document_event')
   }
   return modelInstance
}
