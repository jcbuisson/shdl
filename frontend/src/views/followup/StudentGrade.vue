<template>
   <div class="pa-2">
      <!-- attendance -->
      <template v-for="group in userGroups" :key="group.uid">
         <StudentGroupAttendance :user_uid="user_uid" :group="group"/>
      </template>

      <!-- test results -->
      <!-- <div>Tests : {{ tests.map(test => test.name) }}</div> -->
       <h3>Tests</h3>
      <v-table density="compact">
         <thead>
            <tr>
               <th class="text-left">Nom</th>
               <th class="text-left">Réussite</th>
               <th class="text-left">Date réussite</th>
               <th class="text-left">Autonomie</th>
            </tr>
         </thead>
         <tbody>
            <tr v-for="test in tests" :key="test.uid">
               <td>{{ test.name }}</td>
               <td><v-icon>{{ isTestSuccessful(test.uid) ? 'mdi-check' : 'mdi-close' }}</v-icon></td>
               <!-- <td>{{ format(testEvent(test.uid)?.date, "eee d MMMM yyyy, HH'h'mm", { locale: fr }) }}</td> -->
               <td>{{ testEventDate(test.uid) }}</td>
            </tr>
         </tbody>
      </v-table>

      <!-- test events -->
      <!-- <div>Test events : {{ testEvents }}</div> -->

      <!-- final grade -->
      <div>Note finale : {{ grade }}</div>
   </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, computed, watch } from 'vue'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

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

const isTestSuccessful = computed(() => (shdl_test_uid) => {
   return testEvents.value.some(testEvent => testEvent.success && testEvent.shdl_test_uid === shdl_test_uid)
})

const testEventDate = computed(() => (shdl_test_uid) => {
   const testEvent = testEvents.value.find(testEvent => testEvent.shdl_test_uid === shdl_test_uid)
   return testEvent ? format(testEvent.date, "eee d MMMM yyyy, HH'h'mm", { locale: fr }) : ''
})
</script>
