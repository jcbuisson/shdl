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

   async function addModule(module) {
      return await db.modules.add(module)
   }
   
   async function updateModule(module) {
      return await db.modules.update(module.name, module)
   }

   return {
      db, reset,
      getModule, addModule, updateModule,
   }
}
