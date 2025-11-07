
import { useModel } from '/src/use/useModel.ts';


export function useUser(app) {
   const { createModel } = useModel(app);

   const model = createModel(import.meta.env.VITE_APP_USER_IDB, 'user', ['email', 'firstname', 'lastname'])

   // special case of signin: create/update record of user
   const putUser = async (value) => {
      const db = model.db
      // put: create (if new) or update
      return await db.values.put(value)
   }

   return { ...model, putUser }
}

/////////////          UTILITIES          /////////////

export function getFullname(user) {
   if (!user) return ''
   if (user.firstname && user.lastname) return user.lastname + ' ' + user.firstname
   return user.lastname || user.firstname
}
