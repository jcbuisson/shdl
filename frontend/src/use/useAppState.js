import { computed } from 'vue'
import Dexie from "dexie"
import { liveQuery } from "dexie"
import { useObservable } from "@vueuse/rxjs"


export const db = new Dexie("appstateDatabaseSHDL")

db.version(1).stores({
   keyval: "key",
})

export const resetUseAppState = async () => {
   await db.keyval.clear()
}

/////////////////       expiresAt       /////////////////

export async function setExpiresAt(date) {
   await db.keyval.put({ key: 'expiresAt', date })
}

const expiresAtRecord = useObservable(liveQuery(() => db.keyval.get('expiresAt')))

export const expiresAt = computed(() => {
   if (!expiresAtRecord.value) return null
   return expiresAtRecord.value.date
})


/////////////////       user-manager split width       /////////////////

export async function setUserManagerSplitWidth(value) {
   db.keyval.put({ key: 'user-manager-split-width', value })
}

const kvUserManagerSplitWidth = useObservable(liveQuery(() => db.keyval.get('user-manager-split-width')))
export const userManagerSplitWidth = computed(() => kvUserManagerSplitWidth?.value?.value)



/////////////////       student-manager split width       /////////////////

export async function setStudentManagerSplitWidth(value) {
   db.keyval.put({ key: 'student-manager-split-width', value })
}

const kvStudentManagerSplitWidth = useObservable(liveQuery(() => db.keyval.get('student-manager-split-width')))
export const studentManagerSplitWidth = computed(() => kvStudentManagerSplitWidth?.value?.value)


export async function setStudentManagerWorkshopSplitWidth(value) {
   db.keyval.put({ key: 'student-manager-workshop-split-width', value })
}

const kvStudentManagerWorkshopSplitWidth = useObservable(liveQuery(() => db.keyval.get('student-manager-workshop-split-width')))
export const studentManagerWorkshopSplitWidth = computed(() => kvStudentManagerWorkshopSplitWidth?.value?.value)



/////////////////       workshop split width       /////////////////

export async function setWorkshopSplitWidth(value) {
   db.keyval.put({ key: 'workshop-split-width', value })
}

const kvWorkshopSplitWidth = useObservable(liveQuery(() => db.keyval.get('workshop-split-width')))
export const workshopSplitWidth = computed(() => kvWorkshopSplitWidth?.value?.value)



// /////////////////       activity graph date min & max       /////////////////

// export async function setActivityGraphDateMin(value) {
//    db.keyval.put({ key: 'activity-graph-date-min', value })
// }

// const kvActivityGraphDateMin = useObservable(liveQuery(() => db.keyval.get('activity-graph-date-min')))
// export const activityGraphDateMin = computed(() => kvActivityGraphDateMin?.value?.value)


// export async function setActivityGraphDateMax(value) {
//    db.keyval.put({ key: 'activity-graph-date-max', value })
// }

// const kvActivityGraphDateMax = useObservable(liveQuery(() => db.keyval.get('activity-graph-date-max')))
// export const activityGraphDateMax = computed(() => kvActivityGraphDateMax?.value?.value)

