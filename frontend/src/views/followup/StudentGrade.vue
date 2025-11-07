<template>
   <div class="pa-2">
      <!-- final grade -->
      <h2 v-if="grade">Note finale : {{ grade }}</h2>
      <v-divider :thickness="3"/>

      <!-- attendance -->
      <template v-for="group in userGroups" :key="group.uid">
         <StudentGroupAttendance :user_uid="user_uid" :group="group"/>
      </template>
      <h4>Taux de présence : {{ attendanceGrade + ' %' }}</h4>
      <v-divider :thickness="3"/>

      <!-- test results -->
      <h3 class="my-2">Tests</h3>
      <v-table density="compact">
         <thead>
            <tr>
               <th class="text-left">Nom</th>
               <th class="text-left">Coefficient</th>
               <th class="text-left">Réussite</th>
               <th class="text-left">Note (%)</th>
            </tr>
         </thead>
         <tbody>
            <tr v-for="test in userTests" :key="test.uid">
               <td>{{ test.name }}</td>
               <td>{{ test.weight }}</td>
               <td v-if="testSuccessDate(test.uid)">{{ testSuccessDate(test.uid) }}</td>
               <td v-else><v-icon>mdi-close</v-icon></td>
               <td>
                  <v-slider
                     show-ticks="always"
                     :tticks="{ 0: '0%', 25: '25%', 50: '50%', 75: '75%', 100: '100%'}"
                     thumb-label
                     step="25"
                     tick-size="4"
                     :model-value="testEvaluation(test.uid)"
                     @end="value => onEvaluationChange(test.uid, value)"
                  ></v-slider>
               </td>
            </tr>
         </tbody>
      </v-table>
      <h4>Évaluation des tests : {{ testGrade + ' %' }}</h4>
      <v-divider :thickness="3"/>
   </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, computed, watch } from 'vue'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import useExpressXClient from '/src/use/useExpressXClient';

import { useUserSHDLTestRelation } from '/src/use/useUserSHDLTestRelation'
import { useBusinessObservables } from '/src/use/useBusinessObservables'

import StudentGroupAttendance from '/src/views/followup/StudentGroupAttendance.vue'

const { app } = useExpressXClient();
const { create: createUserTestRelation, update: updateUserTestEvent } = useUserSHDLTestRelation(app)
const { userGroups$, userSHDLTests$, userSHDLTestsRelations$, userAttendanceGrade$, userTestGrade$, userGrade$ } = useBusinessObservables(app)

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
const testRelations = ref()

const subscriptions = []

watch(
   () => props.user_uid,

   async (user_uid) => {
      const groups$ = userGroups$(user_uid)
      subscriptions.push(groups$.subscribe(list => {
         userGroups.value = list
      }))

      const now = new Date()

      subscriptions.push(userAttendanceGrade$(props.user_uid, now).subscribe(grade_ => {
         attendanceGrade.value = grade_
      }))

      subscriptions.push(userTestGrade$(props.user_uid).subscribe(grade_ => {
         testGrade.value = grade_
      }))

      subscriptions.push(userGrade$(props.user_uid, now).subscribe(grade_ => {
         grade.value = grade_
      }))

      subscriptions.push(userSHDLTests$(props.user_uid).subscribe(tests => {
         userTests.value = tests
      }))

      subscriptions.push(userSHDLTestsRelations$(props.user_uid).subscribe(testRelations_ => {
         testRelations.value = testRelations_
      }))
   },
   { immediate: true } // so that it's called on component mount
)

onUnmounted(() => {
   for (const subscription of subscriptions) {
      subscription.unsubscribe()
   }
})

const testSuccessDate = computed(() => (shdl_test_uid) => {
   if (!testRelations.value) return null
   const testRelation = testRelations.value.find(testRelation => testRelation.shdl_test_uid === shdl_test_uid)
   return testRelation?.success_date ? format(testRelation.success_date, "eee d MMMM yyyy, HH'h'mm", { locale: fr }) : null
})

const testEvaluation = computed(() => (shdl_test_uid) => {
   if (!testRelations.value) return 0
   const testRelation = testRelations.value.find(testRelation => testRelation.shdl_test_uid === shdl_test_uid)
   return testRelation?.evaluation
})

async function onEvaluationChange(shdl_test_uid, evaluation) {
   // console.log('shdl_test_uid, value', shdl_test_uid, value)
   if (!testRelations.value) return
   const testRelation = testRelations.value.find(testRelation => testRelation.shdl_test_uid === shdl_test_uid)
   if (testRelation) {
      await updateUserTestEvent(testRelation.uid, {
         evaluation
      })
   } else {
      await createUserTestRelation({
         user_uid: props.user_uid,
         shdl_test_uid,
         evaluation,
      })
   }
}
</script>
