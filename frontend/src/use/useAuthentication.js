import { useDebounceFn } from '@vueuse/core'

import { resetUseAppState, setExpiresAt, setAuthTabs } from '/src/use/useAppState'
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

   const { reset: resetSHDLModule } = useSHDLModule(app)
   const { putUser } = useUser(app)

   async function clearCaches() {
      console.log('clearCaches - starting')

      // Helper to add timeout to any promise
      const withTimeout = (promise, name, timeoutMs = 5000) => {
         return Promise.race([
            promise,
            new Promise((_, reject) =>
               setTimeout(() => reject(new Error(`Timeout clearing ${name}`)), timeoutMs)
            )
         ])
      }

      // Run all resets in parallel with timeout protection
      const resetPromises = [
         withTimeout(resetUseAppState(), 'AppState'),
         withTimeout(resetSHDLModule(), 'SHDLModule'),
      ]

      const results = await Promise.allSettled(resetPromises)

      // Log any failures
      results.forEach((result, index) => {
         if (result.status === 'rejected') {
            console.error('Failed to clear cache:', result.reason)
         }
      })

      console.log('clearCaches - completed')
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
      const { user, expiresAt, tabs } = await app.service('auth').signin(email, password)
      setExpiresAt(expiresAt)
      setAuthTabs(tabs)
      await putUser(user)      
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

   async function refreshExpiration() {
      if (!app.isConnected) throw new Error('Socket is not connected')
      console.log('DO extend expiration')
      await app.service('auth').extendExpiration()
   }

   const extendExpiration = useDebounceFn(refreshExpiration, 5000)

   return {
      clearCaches,
      restartApp,
      signin,
      signup,
      signout,
      extendExpiration,
      refreshExpiration,
   }
}
