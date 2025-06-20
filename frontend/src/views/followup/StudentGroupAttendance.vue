<template>
   <template v-if="groupSlotList.length > 0">
      <h3>{{ group.name }}</h3>
      <!-- {{ userEventList }} -->
      <v-table density="compact">
         <thead>
            <tr>
               <th class="text-left">Nom</th>
               <th class="text-left">Début</th>
               <th class="text-left">Fin</th>
               <th class="text-left">Actif</th>
               <th class="text-left">Excusé</th>
            </tr>
         </thead>
         <tbody>
            <tr v-for="slot in groupSlotList" :key="slot.uid">
               <td>{{ slot.name }}</td>
               <td>{{ format(slot.start, "eee d MMMM yyyy, HH'h'mm", { locale: fr }) }}</td>
               <td>{{ format(slot.end, "eee d MMMM yyyy, HH'h'mm", { locale: fr }) }}</td>
               <td><v-icon>{{ activityStatus(slot) }}</v-icon></td>
               <td><v-checkbox density="compact" hide-details :modelValue="isExcused(slot)" @input="onExcuseClick(slot)"></v-checkbox></td>
            </tr>
         </tbody>
      </v-table>
   </template>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import { useGroupSlot } from '/src/use/useGroupSlot'
import { useUserSlotExcuse } from '/src/use/useUserSlotExcuse'

const { getObservable: groupSlots$ } = useGroupSlot()
const { getObservable: userSlotExcuses$, create: createUserSlotExcuse, remove: removeUserSlotExcuse } = useUserSlotExcuse()

import { userEvents$ } from '/src/lib/businessObservables'


const props = defineProps({
   user_uid: {
      type: String,
   },
   group: {
      type: Object,
   },
})

const groupSlotList = ref([])
const userExcuseList = ref([])
const userEventList = ref([])
const subscriptions = [] 

watch(
   () => [props.user_uid, props.group],
   async ([user_uid, group]) => {
      // console.log('watch', user_uid, group)
      const slots$ = groupSlots$({ group_uid: group.uid })
      subscriptions.push(slots$.subscribe(list => {
         groupSlotList.value = list.toSorted((s1, s2) => (s1.start > s2.start) ? 1 : (s1.start < s2.start) ? -1 : 0)
      }))
      const excuses$ = userSlotExcuses$({ user_uid})
      subscriptions.push(excuses$.subscribe(list => {
         userExcuseList.value = list
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

async function onExcuseClick(slot) {
   if (isExcused(slot)) {
      const userExcuse = userExcuseList.value.find(excuse => excuse.group_slot_uid === slot.uid)
      await removeUserSlotExcuse(userExcuse.uid)
   } else {
      await createUserSlotExcuse({
         user_uid: props.user_uid,
         group_slot_uid: slot.uid,
      })
   }
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
