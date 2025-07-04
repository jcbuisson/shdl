import Dexie from "dexie"
import { from } from 'rxjs'
import { liveQuery } from "dexie"


export function useSHDLModule() {

   const db = new Dexie("SHDLModules")

   db.version(1).stores({
      modules: "document_uid, name",
   })

   const reset = async () => {
      await db.modules.clear()
   }

   const module$ = (document_uid) => {
      return from(liveQuery(() => db.modules.get(document_uid)))
   }

   async function addOrUpdateModule(module) {
      return await db.modules.put(module)
   }

   return {
      db, reset,
      module$,
      addOrUpdateModule,
   }
}
