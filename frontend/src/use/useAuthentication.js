import { useDebounceFn } from '@vueuse/core'

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
import { useUserSHDLTestRelation } from '/src/use/useUserSHDLTestRelation'
import { useUserSlotExcuse } from '/src/use/useUserSlotExcuse'
import { useUserTabRelation } from '/src/use/useUserTabRelation'

import router from '/src/router'


export function useAuthentication(app) {

   const { reset: resetUseGroup, initWorker: initGroupWorker } = useGroup(app)
   const { reset: resetUseGroupSlot } = useGroupSlot(app)
   const { reset: resetUseGroupSlotSHDLTestRelation } = useGroupSlotSHDLTestRelation(app)
   const { reset: resetSHDLModule } = useSHDLModule(app)
   const { reset: resetUseSHDLTest } = useSHDLTest(app)
   const { reset: resetUseUser, putUser } = useUser(app)
   const { reset: resetUseUserDocument } = useUserDocument(app)
   const { reset: resetUseUserDocumentEvent } = useUserDocumentEvent(app)
   const { reset: resetUseUserGroupRelation } = useUserGroupRelation(app)
   const { reset: resetUseUserSHDLTestEvent } = useUserSHDLTestRelation(app)
   const { reset: resetUseUserSlotExcuse } = useUserSlotExcuse(app)
   const { reset: resetUseUserTabRelation } = useUserTabRelation(app)


   async function clearCaches() {
      console.log('clearCaches')   
      // resetUseAuthentication()
      await resetUseAppState()
      await resetUseGroup()
      await resetUseGroupSlot()
      await resetUseGroupSlotSHDLTestRelation()
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

   const restartApp = async () => {
      await clearCaches()
      try {
         // can fail if connection is broken
         await app.service('auth').signout()
      } catch(err) {}
      router.push('/')
   }



   ////////////////////////           LOGIN / LOGOUT            ////////////////////////

   // throws an error 'wrong-credentials' if wrong email / password
   async function signin(email, password) {
      await clearCaches()
      const { user, expiresAt } = await app.service('auth').signin(email, password)
      setExpiresAt(expiresAt)
      await putUser(user)

      initGroupWorker(import.meta.env.VITE_APP_GROUP_IDB, 'group', email, password)
      return user
   }

   async function signup(email, firstname, lastname) {
      await app.service('auth').signup(email, firstname, lastname)
   }

   async function signout(user) {
      await clearCaches()
      try {
         await app.service('auth').signout()
      } catch(err) {
         console.log('logout err', err)
      }
   }

   const extendExpiration = useDebounceFn(doExtendExpiration, 5000)

   async function doExtendExpiration() {
      if (!app.isConnected()) return
      console.log('DO extend expiration')
      await app.service('auth', { volatile: true }).extendExpiration()
   }

   return {
      clearCaches,
      restartApp,
      signin,
      signup,
      signout,
      extendExpiration,
   }
}
