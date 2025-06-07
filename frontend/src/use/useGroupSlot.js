
import useModel from '/src/use/useModel.ts'


/////////////          CRUD/SYNC METHODS          /////////////

const {
   db, reset,
   create, update, remove,
   addPerimeter, getObservable,
   synchronizeAll,
} = useModel(import.meta.env.VITE_APP_GROUP_SLOT_IDB, 'group_slot', ['group_uid', 'name', 'start', 'end'])


export {
   db, reset,
   create, update, remove,
   addPerimeter, getObservable,
   synchronizeAll,
}
