<template>
   <template v-if="groupSlotList.length > 0">
      <h3>{{ group.name }}</h3>
      <v-table density="compact">
         <thead>
            <tr>
               <th class="text-left">Nom</th>
               <th class="text-left">Début</th>
               <th class="text-left">Fin</th>
               <th class="text-left">Excusé</th>
            </tr>
         </thead>
         <tbody>
            <tr v-for="slot in groupSlotList" :key="slot.uid">
               <td>{{ slot.name }}</td>
               <td>{{ format(slot.start, "eee d MMMM yyyy, HH'h'mm", { locale: fr }) }}</td>
               <td>{{ format(slot.end, "eee d MMMM yyyy, HH'h'mm", { locale: fr }) }}</td>
               <td><v-checkbox density="compact" hide-details :modelValue="isExcused(slot)" @input="onExcuseClick(slot)"></v-checkbox></td>
            </tr>
         </tbody>
      </v-table>
   </template>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useObservable } from '@vueuse/rxjs'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import { useGroupSlot } from '/src/use/useGroupSlot'
import { useUserSlotExcuse } from '/src/use/useUserSlotExcuse'

const { getObservable: groupSlots$ } = useGroupSlot()
const { getObservable: userSlotExcuses$, create: createUserSlotExcuse, remove: removeUserSlotExcuse } = useUserSlotExcuse()


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
const subscriptions = [] 

watch(
   () => [props.user_uid, props.group],
   async ([user_uid, group]) => {
      console.log('watch', user_uid, group)
      const slots$ = groupSlots$({ group_uid: props.group.uid })
      subscriptions.push(slots$.subscribe(list => {
         groupSlotList.value = list.toSorted((s1, s2) => (s1.start > s2.start) ? 1 : (s1.start < s2.start) ? -1 : 0)
      }))
      const excuses$ = userSlotExcuses$({ user_uid: props.user_uid})
      subscriptions.push(excuses$.subscribe(list => {
         userExcuseList.value = list
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
</script>
