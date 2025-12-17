import Dexie from "dexie"
import { from } from 'rxjs'
import { liveQuery } from "dexie"

// Info on modules stored in IndexedDB (not in database)

// Create singleton Dexie instance to share across all components
let dbInstance = null

function getDbInstance() {
   if (!dbInstance) {
      dbInstance = new Dexie(import.meta.env.VITE_APP_SHDL_MODULE_IDB)
      dbInstance.version(1).stores({
         // Indexed by document_uid and name
         modules: "document_uid, name",
      })
   }
   return dbInstance
}

export function useSHDLModule() {

   const db = getDbInstance()

   const reset = async () => {
      await db.modules.clear()
   }

   const modules$ = () => {
      return from(liveQuery(() => db.modules.toArray()))
   }

   const module$ = (document_uid) => {
      return from(liveQuery(() => db.modules.get(document_uid)))
   }

   async function addOrUpdateModule(module) {
      return await db.modules.put(module)
   }

   return {
      db, reset,
      modules$,
      module$,
      addOrUpdateModule,
   }
}
