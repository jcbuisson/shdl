import { useSharedElectricModel } from './useSharedElectricModel'

let modelInstance = null

export function useUserDocumentEvent(app) {
   if (!modelInstance) {
      modelInstance = useSharedElectricModel(app, 'user_document_event')
   }
   return modelInstance
}
