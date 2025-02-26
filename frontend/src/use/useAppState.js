import { computed } from 'vue'
import Dexie from "dexie"
import { liveQuery } from "dexie"
import { useObservable } from "@vueuse/rxjs"


export const db = new Dexie("appstateDatabase")

db.version(1).stores({
   keyval: "key",
})

export const resetUseAppState = async () => {
   await db.keyval.clear()
}

export async function setExpiresAt(date) {
   await db.keyval.put({ key: 'expiresAt', date })
}

const expiresAtRecord = useObservable(liveQuery(() => db.keyval.get('expiresAt')))

export const expiresAt = computed(() => {
   if (!expiresAtRecord.value) return null
   return expiresAtRecord.value.date
})
