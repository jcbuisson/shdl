<template>
   NOTE
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { Observable, from, map, of, merge, combineLatest, firstValueFrom } from 'rxjs'
import { mergeMap, switchMap, scan, tap, catchError } from 'rxjs/operators'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import { useGroupSlot } from '/src/use/useGroupSlot'
import { useUserSlotExcuse } from '/src/use/useUserSlotExcuse'
import { useUserDocument } from '/src/use/useUserDocument'
import { useUserDocumentEvent } from '/src/use/useUserDocumentEvent'

// const { getObservable: groupSlots$ } = useGroupSlot()
const { getObservable: userSlotExcuses$, create: createUserSlotExcuse, remove: removeUserSlotExcuse } = useUserSlotExcuse()
const { getObservable: userDocument$ } = useUserDocument()
const { getObservable: userDocumentEvent$ } = useUserDocumentEvent()

import { guardCombineLatest } from '/src/lib/utilities'


const props = defineProps({
   user_uid: {
      type: String,
   },
})

// const groupSlotList = ref([])
const userExcuseList = ref([])
const userEventList = ref([])
const subscriptions = [] 

watch(
   () => [props.user_uid, props.group],
   async ([user_uid, group]) => {
      // console.log('watch', user_uid, group)
      // const slots$ = groupSlots$({ group_uid: group.uid })
      // subscriptions.push(slots$.subscribe(list => {
      //    groupSlotList.value = list.toSorted((s1, s2) => (s1.start > s2.start) ? 1 : (s1.start < s2.start) ? -1 : 0)
      // }))
      const excuses$ = userSlotExcuses$({ user_uid})
      subscriptions.push(excuses$.subscribe(list => {
         userExcuseList.value = list
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
