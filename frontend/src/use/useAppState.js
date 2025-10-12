import { computed } from 'vue'

import { useSessionStorage } from '@vueuse/core'

function initialState() {
   return {
      expiresAt: null,
      'user-manager-split-width': null,
      'student-manager-workshop-split-width': null,
   }
}
const state = useSessionStorage('appState', initialState())

export const resetUseAppState = async () => {
   state.value = initialState()
}

/////////////////       expiresAt       /////////////////

export function setExpiresAt(date) {
   state.value.expiresAt = date
}

export const expiresAt = computed(() => {
   return state.value.expiresAt
})


/////////////////       user-manager split width       /////////////////

export function setUserManagerSplitWidth(value) {
   state.value['user-manager-split-width'] = value
}

export const userManagerSplitWidth = computed(() => state.value['user-manager-split-width'])



/////////////////       student-manager split width       /////////////////

export function setStudentManagerSplitWidth(value) {
   state.value['student-manager-split-width'] = value
}
export const studentManagerSplitWidth = computed(() => state.value['student-manager-split-width'])

export function setStudentManagerWorkshopSplitWidth(value) {
   state.value['student-manager-workshop-split-width'] = value
}
export const studentManagerWorkshopSplitWidth = computed(() => state.value['student-manager-workshop-split-width'])


/////////////////       workshop split width       /////////////////

export function setWorkshopSplitWidth(value) {
   state.value['workshop-split-width'] = value
}
export const workshopSplitWidth = computed(() => state.value['workshop-split-width'])


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

