
let modelInstance = null

export function useUser(app) {
   if (!modelInstance) {
      modelInstance = app.createOfflineModel('user', ['email', 'firstname', 'lastname'])
   }

   // special case of signin: create/update record of user
   const putUser = async (value) => {
      const db = modelInstance.db
      // put: create (if new) or update
      return await db.values.put(value)
   }

   return { ...modelInstance, putUser }
}

/////////////          UTILITIES          /////////////

export function getFullname(user) {
   if (!user) return ''
   if (user.firstname && user.lastname) return user.lastname + ' ' + user.firstname
   return user.lastname || user.firstname
}
