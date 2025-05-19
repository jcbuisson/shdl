
import useModel from '/src/use/useModel'


/////////////          CRUD/SYNC METHODS          /////////////

const {
   db, reset,
   create, update, remove,
   addPerimeter,
   synchronizeAll,
} = useModel(import.meta.env.VITE_APP_USER_IDB, 'user', ['email', 'firstname', 'lastname'])


/////////////          UTILITIES          /////////////

function getFullname(user) {
   if (!user) return ''
   if (user.firstname && user.lastname) return user.lastname + ' ' + user.firstname
   return user.lastname || user.firstname
}

// special case of signin: create/update record of user
export const put = async (value) => {
   // put: create (if new) or update
   return await db.values.put(value)
}

export {
   db, reset,
   create, update, remove,
   addPerimeter,
   synchronizeAll,
   
   getFullname,
}
