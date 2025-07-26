import { useDebounceFn } from '@vueuse/core'
import { app, isConnected } from '/src/client-app.js'

import { resetUseAppState, setExpiresAt } from '/src/use/useAppState'
import { useGroup } from '/src/use/useGroup'
import { useGroupSlot } from '/src/use/useGroupSlot'
import { useGroupSlotSHDLTestRelation } from '/src/use/useGroupSlotSHDLTestRelation'
import { useSHDLModule } from '/src/use/useSHDLModule'
import { useSHDLTest } from '/src/use/useSHDLTest'
import { useUser } from '/src/use/useUser'
import { useUserDocument } from '/src/use/useUserDocument'
import { useUserDocumentEvent } from '/src/use/useUserDocumentEvent'
import { useUserGroupRelation } from '/src/use/useUserGroupRelation'
import { useUserSHDLTestEvent } from '/src/use/useUserSHDLTestEvent'
import { useUserSlotExcuse } from '/src/use/useUserSlotExcuse'
import { useUserTabRelation } from '/src/use/useUserTabRelation'

import router from '/src/router'

const { reset: resetUseGroup } = useGroup()
const { reset: resetUseGroupSlot } = useGroupSlot()
const { reset: resetUseGroupSlotSHDLTestRelation } = useGroupSlotSHDLTestRelation()
const { reset: resetSHDLModule } = useSHDLModule()
const { reset: resetUseSHDLTest } = useSHDLTest()
const { reset: resetUseUser, putUser } = useUser()
const { reset: resetUseUserDocument } = useUserDocument()
const { reset: resetUseUserDocumentEvent } = useUserDocumentEvent()
const { reset: resetUseUserGroupRelation } = useUserGroupRelation()
const { reset: resetUseUserSHDLTestEvent } = useUserSHDLTestEvent()
const { reset: resetUseUserSlotExcuse } = useUserSlotExcuse()
const { reset: resetUseUserTabRelation } = useUserTabRelation()


export async function clearCaches() {
   console.log('clearCaches')   
   // resetUseAuthentication()
   await resetUseAppState()
   await resetUseGroup()
   await resetUseGroupSlot()
   await resetUseGroupSlotSHDLTestRelation
   await resetSHDLModule()
   await resetUseSHDLTest()
   await resetUseUser()
   await resetUseUserDocument()
   await resetUseUserDocumentEvent()
   await resetUseUserGroupRelation()
   await resetUseUserSHDLTestEvent()
   await resetUseUserSlotExcuse()
   await resetUseUserTabRelation()
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
