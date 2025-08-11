<template>
   {{ xxx }}
   <div class="pa-2">
      <!-- attendance -->
      <template v-for="group in userGroups" :key="group.uid">
         <StudentGroupAttendance :user_uid="user_uid" :group="group"/>
      </template>
      <h4>Note présence : {{ attendanceGrade ? attendanceGrade + ' / 20' : '' }}</h4>

      <!-- test results -->
      <!-- <div>Tests : {{ userTests.map(test => test.name) }}</div> -->
      <h3 class="my-2">Tests</h3>
      <v-table density="compact">
         <thead>
            <tr>
               <th class="text-left">Nom</th>
               <th class="text-left">Réussite</th>
               <th class="text-left">Date réussite</th>
               <th class="text-left">Autonomie (%)</th>
            </tr>
         </thead>
         <tbody>
            <tr v-for="test in userTests" :key="test.uid">
               <td>{{ test.name }}</td>
               <td><v-icon>{{ isTestSuccessful(test.uid) ? 'mdi-check' : 'mdi-close' }}</v-icon></td>
               <td>{{ testEventDate(test.uid) }}</td>
               <td>
                  <v-slider v-if="isTestSuccessful(test.uid)"
                     show-ticks="always"
                     :tticks="{ 0: '0%', 25: '25%', 50: '50%', 75: '75%', 100: '100%'}"
                     thumb-label
                     step="25"
                     tick-size="4"
                     :model-value="testEventAutonomy(test.uid)"
                     @end="value => onAutonomyChange(test.uid, value)"
                  ></v-slider>
               </td>
            </tr>
         </tbody>
      </v-table>
      <h4>Note tests : {{ testGrade ? testGrade + ' / 20' : '' }}</h4>

      <!-- final grade -->
      <h2 v-if="grade">Note finale : {{ grade }}</h2>
   </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, computed, watch } from 'vue'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import { useUserSHDLTestEvent } from '/src/use/useUserSHDLTestEvent'
import { userGroups$, userSHDLTests$, userSHDLTestsEvents$, userAttendanceGrade$, userTestGrade$, userGrade$ } from '/src/lib/businessObservables'
import StudentGroupAttendance from '/src/views/followup/StudentGroupAttendance.vue'

const { update: updateUserTestEvent } = useUserSHDLTestEvent()

const props = defineProps({
   user_uid: {
      type: String,
   },
})

const userGroups = ref([])
const attendanceGrade = ref(-1)
const testGrade = ref(-1)
const grade = ref(-1)
const userTests = ref()
const testEvents = ref()
const xxx = ref()

const subscriptions = []

watch(
   () => props.user_uid,

   async (user_uid) => {
      const groups$ = userGroups$(user_uid)
      subscriptions.push(groups$.subscribe(list => {
         userGroups.value = list
      }))

      subscriptions.push(userAttendanceGrade$(props.user_uid).subscribe(grade_ => {
         attendanceGrade.value = grade_
      }))

      subscriptions.push(userTestGrade$(props.user_uid).subscribe(grade_ => {
         testGrade.value = grade_
      }))

      subscriptions.push(userGrade$(props.user_uid).subscribe(grade_ => {
         grade.value = grade_
      }))

      subscriptions.push(userSHDLTests$(props.user_uid).subscribe(tests => {
         userTests.value = tests
      }))

      subscriptions.push(userSHDLTestsEvents$(props.user_uid).subscribe(testEvents_ => {
         testEvents.value = testEvents_
      }))

      subscriptions.push(userTestGrade$(props.user_uid).subscribe(x => {
         xxx.value = x
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
   if (!testEvents.value) return false
   return testEvents.value.some(testEvent => testEvent.success && testEvent.shdl_test_uid === shdl_test_uid)
})

const testEventDate = computed(() => (shdl_test_uid) => {
   if (!testEvents.value) return ''
   const testEvent = testEvents.value.find(testEvent => testEvent.shdl_test_uid === shdl_test_uid)
   return testEvent ? format(testEvent.date, "eee d MMMM yyyy, HH'h'mm", { locale: fr }) : ''
})

const testEventAutonomy = computed(() => (shdl_test_uid) => {
   if (!testEvents.value) return 0
   const testEvent = testEvents.value.find(testEvent => testEvent.shdl_test_uid === shdl_test_uid)
   return testEvent?.autonomy
})

async function onAutonomyChange(shdl_test_uid, value) {
   // console.log('shdl_test_uid, value', shdl_test_uid, value)
   if (!testEvents.value) return
   const testEvent = testEvents.value.find(testEvent => testEvent.shdl_test_uid === shdl_test_uid)
   await updateUserTestEvent(testEvent.uid, {
      autonomy: value
   })
}
</script>
