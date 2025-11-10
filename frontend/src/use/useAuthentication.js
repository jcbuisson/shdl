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

   const { reset: resetUseGroup, initWorker: initGroupSyncWorker } = useGroup(app)
   const { reset: resetUseGroupSlot, initWorker: initGroupSlotSyncWorker } = useGroupSlot(app)
   const { reset: resetUseGroupSlotSHDLTestRelation, initWorker: initGroupSlotSHDLTestSyncWorker } = useGroupSlotSHDLTestRelation(app)
   const { reset: resetUseSHDLTest, initWorker: initSHDLTestSyncWorker } = useSHDLTest(app)
   const { reset: resetUseUser, putUser, initWorker: initUserSyncWorker } = useUser(app)
   const { reset: resetUseUserDocument, initWorker: initUserDocumentSyncWorker } = useUserDocument(app)
   const { reset: resetUseUserDocumentEvent, initWorker: initUserDocumentEventSyncWorker } = useUserDocumentEvent(app)
   const { reset: resetUseUserGroupRelation, initWorker: initUserGroupRelationSyncWorker } = useUserGroupRelation(app)
   const { reset: resetUseUserSHDLTestEvent, initWorker: initUserSHDLTestSyncWorker } = useUserSHDLTestRelation(app)
   const { reset: resetUseUserSlotExcuse, initWorker: initUserSlotExcuseSyncWorker } = useUserSlotExcuse(app)
   const { reset: resetUseUserTabRelation, initWorker: initUserTabRelationSyncWorker } = useUserTabRelation(app)
   const { reset: resetSHDLModule } = useSHDLModule(app)


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

      await initGroupSyncWorker(email, password);
      await initGroupSlotSyncWorker(email, password);
      await initGroupSlotSHDLTestSyncWorker(email, password);
      await initSHDLTestSyncWorker(email, password);
      await initUserSyncWorker(email, password);
      await initUserDocumentSyncWorker(email, password);
      await initUserDocumentEventSyncWorker(email, password);
      await initUserGroupRelationSyncWorker(email, password);
      await initUserSHDLTestSyncWorker(email, password);
      await initUserSlotExcuseSyncWorker(email, password);
      await initUserTabRelationSyncWorker(email, password);
      
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
