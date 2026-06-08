import { reactive } from 'vue'

interface CRAPSAssembly {
   memory: Record<number, any> | null
   symbols: Record<string, any> | null
   errorMsg: string | null
}

// Singleton reactive record: document_uid → assembly result
// Plain object so Vue can track property access reactively
const assemblies = reactive<Record<string, CRAPSAssembly>>({})

export function useCRAPSAssembly() {
   function setAssembly(document_uid: string, assembly: CRAPSAssembly) {
      assemblies[document_uid] = assembly
   }

   return { setAssembly, assemblies }
}
