<template>
   <!-- <div>{{ groupSlotList }}</div>
   <div>{{ userEventList }}</div> -->
   <div>Présence : {{ activeCount }} séance / {{ groupSlotList.length }} séances</div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue'

import { useUserSlotExcuse } from '/src/use/useUserSlotExcuse'
import { userSlots$, userEvents$ } from '/src/lib/businessObservables'

const { getObservable: userSlotExcuses$ } = useUserSlotExcuse()


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
      const now = new Date()

      const slots$ = userSlots$(user_uid)
      subscriptions.push(slots$.subscribe(slots => {
         groupSlotList.value = slots.filter(slot => new Date(slot.start) <= now)
      }))

      const excuses$ = userSlotExcuses$({ user_uid})
      subscriptions.push(excuses$.subscribe(excuses => {
         userExcuseList.value = excuses
      }))

      const events$ = userEvents$(user_uid)
      subscriptions.push(events$.subscribe(events => {
         userEventList.value = events
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

const activeCount = computed(() => {
   if (!groupSlotList.value) return 0
   if (!userEventList.value) return 0
   return groupSlotList.value.reduce((accu, slot) => {
      const slotStart = new Date(slot.start)
      const slotEnd = new Date(slot.end)
      if (userEventList.value.some(event => {
         const eventStart = new Date(event.start)
         return (eventStart >= slotStart && eventStart <= slotEnd)
      })) {
         return accu+1
      } else {
         return accu
      }
   }, 0)
})
</script>
