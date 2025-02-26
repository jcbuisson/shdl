import { app } from '/src/client-app.js'

import { resetUseAppState, setExpiresAt } from '/src/use/useAppState'
import { resetUseUser } from '/src/use/useUser'

import router from '/src/router'


export async function clearCaches() {
   console.log('clearCaches')

   sessionStorage.removeItem('userid')
   
   // resetUseAuthentication()
   await resetUseAppState()
   await resetUseUser()
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
export async function signin(email, password) {
   const { user, expiresAt } = await app.service('auth').signin(email, password)
   await setExpiresAt(expiresAt)
   return user
}

export async function signup(email, firstname, lastname) {
   await app.service('auth').signup(email, firstname, lastname)
}

export async function signout(user) {
   clearCaches()
   try {
      await app.service('auth').signout()
   } catch(err) {
      console.log('logout err', err)
   }
}

export async function extendExpiration() {
   await app.service('auth').extendExpiration()
}
