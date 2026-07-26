import { useSharedElectricModel } from './useSharedElectricModel'

let modelInstance = null

export function useUserDocument(app) {
   if (!modelInstance) {
      modelInstance = useSharedElectricModel(app, 'user_document')
   }
   return modelInstance
}
