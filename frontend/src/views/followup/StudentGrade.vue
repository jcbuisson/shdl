<template>
   <div class="pa-2">
      <!-- attendance -->
      <template v-for="group in userGroups" :key="group.uid">
         <StudentGroupAttendance :user_uid="user_uid" :group="group"/>
      </template>

      <!-- test results -->
      <div>Tests : {{ tests.map(test => test.name) }}</div>

      <!-- test events -->
      <div>Test events : {{ testEvents }}</div>

      <!-- final grade -->
      <div>Note finale : {{ grade }}</div>
   </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, computed, watch } from 'vue'

import { userGroups$, userGrade$, userSHDLTests$, userSHDLTestsEvents$ } from '/src/lib/businessObservables'

import StudentGroupAttendance from '/src/views/followup/StudentGroupAttendance.vue'


const props = defineProps({
   user_uid: {
      type: String,
   },
})

const userGroups = ref([])
const grade = ref(-1)
const tests = ref()
const testEvents = ref()

const subscriptions = []

watch(
   () => props.user_uid,
   async (user_uid) => {
      const groups$ = userGroups$(user_uid)
      subscriptions.push(groups$.subscribe(list => {
         userGroups.value = list
      }))

      subscriptions.push(userGrade$(props.user_uid).subscribe(grade_ => {
         grade.value = grade_
      }))

      subscriptions.push(userSHDLTests$(props.user_uid).subscribe(tests_ => {
         tests.value = tests_
      }))

      subscriptions.push(userSHDLTestsEvents$(props.user_uid).subscribe(testEvents_ => {
         testEvents.value = testEvents_
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
