
import useModel from '/src/use/useModel'


/////////////          CRUD/SYNC METHODS          /////////////

const {
   db, reset,
   create, update, remove,
   addPerimeter,
   synchronizeAll,
} = useModel(import.meta.env.VITE_APP_USER_SHDL_MODULE_IDB, 'user_shdl_module', ['user_uid', 'text'])


export {
   db, reset,
   create, update, remove,
   addPerimeter,
   synchronizeAll,
}
