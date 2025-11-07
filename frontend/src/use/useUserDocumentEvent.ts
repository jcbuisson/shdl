
import { useModel } from '/src/use/useModel.ts';

export function useUserDocumentEvent(app) {
   const { createModel } = useModel(app);
   return createModel(import.meta.env.VITE_APP_USER_DOCUMENT_EVENT_IDB, 'user_document_event', ['document_uid', 'type', 'start', 'end'])
}
