
import useModel from '/src/use/useModel'

export function useUserDocumentEvent() {
   return useModel(import.meta.env.VITE_APP_USER_DOCUMENT_EVENT_IDB, 'user_document_event', ['document_uid', 'type', 'start', 'end'])
}
