
let modelInstance = null

export function useUser(app) {
   if (!modelInstance) {
      modelInstance = app.createElectricModel('user', {
         streamOptions: {
            params: {
               columns: ['uid', 'email', 'firstname', 'lastname', 'pict', 'notes'],
            },
         },
      })
   }

   // Electric streams the signed-in user from PostgreSQL; no local cache write is needed.
   const putUser = async (value) => value

   return { ...modelInstance, putUser }
}

/////////////          UTILITIES          /////////////

export function getFullname(user) {
   if (!user) return ''
   if (user.firstname && user.lastname) return user.lastname + ' ' + user.firstname
   return user.lastname || user.firstname
}
