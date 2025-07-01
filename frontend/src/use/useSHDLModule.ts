import Dexie from "dexie"


export function useSHDLModule() {

   const db = new Dexie("SHDLModules")

   db.version(1).stores({
      modules: "name",
   })

   const reset = async () => {
      await db.modules.clear()
   }
   
   async function getModule(name) {
      return await db.modules.get(name)
   }

   async function addOrUpdateModule(module) {
      return await db.modules.put(module)
   }

   return {
      db, reset,
      getModule, addOrUpdateModule,
   }
}
