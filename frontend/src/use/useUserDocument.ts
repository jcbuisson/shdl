
import { useModel } from '/src/use/useModel.ts';

// Create singleton model instance
let modelInstance = null

export function useUserDocument(app) {
   if (!modelInstance) {
      const { createModel } = useModel(app);
      modelInstance = createModel(import.meta.env.VITE_APP_USER_DOCUMENT_IDB, 'user_document', ['user_uid', 'type', 'text']);
   }
   return modelInstance;
}
