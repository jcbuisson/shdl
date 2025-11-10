
import { useModel } from '/src/use/useModel.ts';

// Create singleton model instance
let modelInstance = null

export function useUserDocumentEvent(app) {
   if (!modelInstance) {
      const { createModel } = useModel(app);
      modelInstance = createModel(import.meta.env.VITE_APP_USER_DOCUMENT_EVENT_IDB, 'user_document_event', ['document_uid', 'type', 'start', 'end']);
   }
   return modelInstance;
}
