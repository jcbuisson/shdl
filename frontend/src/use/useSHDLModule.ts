import Dexie from "dexie"
import { from } from 'rxjs'
import { liveQuery } from "dexie"


export function useSHDLModule() {

   const db = new Dexie(import.meta.env.VITE_APP_SHDL_MODULE_IDB)

   db.version(1).stores({
      modules: "document_uid, name, is_valid",
   })

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
