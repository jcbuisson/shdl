
import useModel from '/src/use/useModel'


export function useUser3() {
   return useModel(import.meta.env.VITE_APP_USER_IDB, 'user', ['email', 'firstname', 'lastname'])
}

/////////////          UTILITIES          /////////////

export function getFullname(user) {
   if (!user) return ''
   if (user.firstname && user.lastname) return user.lastname + ' ' + user.firstname
   return user.lastname || user.firstname
}

// special case of signin: create/update record of user
export const put = async (value) => {
   // put: create (if new) or update
   return await db.values.put(value)
}
