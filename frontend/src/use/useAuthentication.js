import { app } from '/src/client-app.js'

import { resetUseAppState, setExpiresAt } from '/src/use/useAppState'
import { resetUseUser } from '/src/use/useUser'

import router from '/src/router'


export function clearCaches() {
   console.log('clearCaches')

   sessionStorage.removeItem('userid')
   
   // resetUseAuthentication()
   resetUseAppState()
   resetUseUser()
}

export const restartApp = async () => {
   clearCaches()
   try {
      // can fail if connection is broken
      await app.service('auth').logout()
   } catch(err) {}
   router.push('/')
}



////////////////////////           LOGIN / LOGOUT            ////////////////////////

// throws an error 'wrong-credentials' if wrong email / password
export async function login(email, password) {
   const { user, expiresAt } = await app.service('auth').signin(email, password)
   await setExpiresAt(expiresAt)
   return user
}

export async function logout(user) {
   clearCaches()
   try {
      await app.service('auth').logout()
   } catch(err) {
      console.log('logout err', err)
   }
}

export async function checkAuthenticationAndExtendExpiration() {
   await app.service('auth').checkAuthenticationAndExtendExpiration()
}
