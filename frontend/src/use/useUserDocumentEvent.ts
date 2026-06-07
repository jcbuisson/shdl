
let modelInstance = null

export function useUserDocumentEvent(app) {
   if (!modelInstance) {
      modelInstance = app.createOfflineModel('user_document_event', ['document_uid', 'type', 'start', 'end'])
   }
   return modelInstance
}
