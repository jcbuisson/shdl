
import useModel from '/src/use/useModel'


/////////////          CRUD/SYNC METHODS          /////////////

const {
   db, reset,
   create, update, remove,
   addPerimeter, getObservable,
   synchronizeAll,
} = useModel(import.meta.env.VITE_APP_USER_DOCUMENT_EVENT_IDB, 'user_document_event', ['document_uid', 'type', 'start', 'end'])


export {
   db, reset,
   create, update, remove,
   addPerimeter, getObservable,
   synchronizeAll,
}
