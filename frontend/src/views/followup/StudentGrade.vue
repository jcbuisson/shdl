<template>
   <div>{{ grade }}</div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue'

import { useUserSlotExcuse } from '/src/use/useUserSlotExcuse'
import { userGrade$ } from '/src/lib/businessObservables'


const props = defineProps({
   user_uid: {
      type: String,
   },
})

const grade = ref()

const subscriptions = [] 


watch(
   () => props.user_uid,
   async (user_uid) => {
      const grade$ = userGrade$(user_uid)
      subscriptions.push(grade$.subscribe(g => {
         grade.value = g
      }))
   },
   { immediate: true } // so that it's called on component mount
)


onUnmounted(() => {
   for (const subscription of subscriptions) {
      subscription.unsubscribe()
   }
})
</script>
