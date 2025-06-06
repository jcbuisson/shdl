import { useDebounceFn } from '@vueuse/core'
import { app, isConnected } from '/src/client-app.js'

import { resetUseAppState, setExpiresAt } from '/src/use/useAppState'
import { reset as resetUseUser, put as putUser } from '/src/use/useUser'
import { reset as resetUseGroup } from '/src/use/useGroup.ts'
import { reset as resetUseGroupSlot } from '/src/use/useGroupSlot'
import { reset as resetUseUserTabRelation } from '/src/use/useUserTabRelation'
import { reset as resetUseUserGroupRelation } from '/src/use/useUserGroupRelation'
import { reset as resetUseUserDocument } from '/src/use/useUserDocument'

import router from '/src/router'


export async function clearCaches() {
   console.log('clearCaches')   
   // resetUseAuthentication()
   await resetUseAppState()
   await resetUseUser()
   await resetUseGroup()
   await resetUseGroupSlot()
   await resetUseUserTabRelation()
   await resetUseUserGroupRelation()
   await resetUseUserDocument()
}

export const restartApp = async () => {
   clearCaches()
   try {
      // can fail if connection is broken
      await app.service('auth').signout()
   } catch(err) {}
   router.push('/')
}



////////////////////////           LOGIN / LOGOUT            ////////////////////////

// throws an error 'wrong-credentials' if wrong email / password
export async function signin(email, password) {
   const { user, expiresAt } = await app.service('auth').signin(email, password)
   await setExpiresAt(expiresAt)
   await putUser(user)
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

export const extendExpiration = useDebounceFn(doExtendExpiration, 5000)

async function doExtendExpiration() {
   if (!isConnected.value) return
   console.log('DO extend expiration')
   await app.service('auth', { volatile: true }).extendExpiration()
}
