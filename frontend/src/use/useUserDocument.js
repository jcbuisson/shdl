
import useModel from '/src/use/useModel'


/////////////          CRUD/SYNC METHODS          /////////////

const {
   db, reset,
   create, update, remove,
   addPerimeter,
   synchronizeAll,
} = useModel(import.meta.env.VITE_APP_USER_DOCUMENT_IDB, 'user_document', ['user_uid', 'type', 'text'])


export {
   db, reset,
   create, update, remove,
   addPerimeter,
   synchronizeAll,
}
