
import { useModel } from '/src/use/useModel.ts';

export function useUserDocument(app) {
   const { createModel } = useModel(app);

   return createModel(import.meta.env.VITE_APP_USER_DOCUMENT_IDB, 'user_document', ['user_uid', 'type', 'text'])
}
