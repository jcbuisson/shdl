
import useModel from '/src/use/useModel'

export function useUserDocument() {
   return useModel(import.meta.env.VITE_APP_USER_DOCUMENT_IDB, 'user_document', ['user_uid', 'type', 'text'])
}
