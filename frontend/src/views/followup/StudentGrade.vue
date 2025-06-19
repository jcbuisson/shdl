<template>
   NOTE
   <div>{{ groupSlotList }}</div>
   <div>{{ userEventList }}</div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { Observable, from, map, of, merge, combineLatest, firstValueFrom } from 'rxjs'
import { mergeMap, switchMap, scan, tap, catchError } from 'rxjs/operators'

import { useGroup } from '/src/use/useGroup'
import { useUserGroupRelation } from '/src/use/useUserGroupRelation'
import { useUserSlotExcuse } from '/src/use/useUserSlotExcuse'
import { useUserDocument } from '/src/use/useUserDocument'
import { useUserDocumentEvent } from '/src/use/useUserDocumentEvent'
import { useGroupSlot } from '/src/use/useGroupSlot'

const { getObservable: groups$ } = useGroup()
const { getObservable: userGroupRelations$ } = useUserGroupRelation()
const { getObservable: userSlotExcuses$, create: createUserSlotExcuse, remove: removeUserSlotExcuse } = useUserSlotExcuse()
const { getObservable: userDocument$ } = useUserDocument()
const { getObservable: userDocumentEvent$ } = useUserDocumentEvent()
const { getObservable: groupSlots$ } = useGroupSlot()

import { guardCombineLatest } from '/src/lib/utilities'


const props = defineProps({
   user_uid: {
      type: String,
   },
})

const userExcuseList = ref([])
const userEventList = ref([])
const groupSlotList = ref([])
const subscriptions = [] 


watch(
   () => props.user_uid,
   async (user_uid) => {

      const slots$ = userGroupSlots$(user_uid)
      subscriptions.push(slots$.subscribe(slots => {
         groupSlotList.value = slots
      }))

      const excuses$ = userSlotExcuses$({ user_uid})
      subscriptions.push(excuses$.subscribe(excuses => {
         userExcuseList.value = excuses
      }))

      const events$ = studentEvents$(user_uid)
      subscriptions.push(events$.subscribe(listOfList => {
         userEventList.value = listOfList.reduce((acc, events) => [...events, ...acc], [])
      }))
   },
   { immediate: true } // so that it's called on component mount
)


onUnmounted(() => {
   for (const subscription of subscriptions) {
      subscription.unsubscribe()
   }
})

function userGroups$(user_uid: string) {
   return userGroupRelations$({ user_uid }).pipe(
      switchMap(relations =>
         guardCombineLatest(relations.map(relation => groups$({ uid: relation.group_uid }).pipe(map(groups => groups[0]))))
      ),
   )
}

function userGroupSlots$(user_uid: string) {
   return userGroupRelations$({ user_uid }).pipe(
      switchMap(relations =>
         guardCombineLatest(relations.map(relation => groupSlots$({ group_uid: relation.group_uid })))
      ),
   )
}

function isExcused(slot) {
   if (!userExcuseList.value) return false
   const uidList = userExcuseList.value.map(excuse => excuse.group_slot_uid)
   return uidList.includes(slot.uid)
}


// emit a list of lists of events, one list per document
function studentEvents$(user_uid: string) {
   return userDocument$({ user_uid }).pipe(
      switchMap(documentList => 
         guardCombineLatest(
            documentList.map(document =>
               userDocumentEvent$({ document_uid: document.uid })
            )
         )
      ),
   )
}

// return 'mdi-check' (active), 'mdi-close' (inactive), undefined (slot is in future)
function activityStatus(slot) {
   if (!userEventList.value) return undefined
   const now = new Date()
   const slotStart = new Date(slot.start)
   const slotEnd = new Date(slot.end)
   if (slotStart > now) return undefined
   if (userEventList.value.some(event => {
      const eventStart = new Date(event.start)
      return (eventStart >= slotStart && eventStart <= slotEnd)
   })) return 'mdi-check'
   return 'mdi-close'
}
</script>
