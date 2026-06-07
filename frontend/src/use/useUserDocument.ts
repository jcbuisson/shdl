
let modelInstance = null

export function useUserDocument(app) {
   if (!modelInstance) {
      modelInstance = app.createOfflineModel('user_document', ['user_uid', 'type', 'text'])
   }
   return modelInstance
}
