<template>
   <div class="pa-8">
      <div v-if="!ready" class="d-flex justify-center align-center" style="min-height: 200px;">
         <v-progress-circular indeterminate color="red-darken-4"></v-progress-circular>
      </div>

      <template v-else>
         <!-- final grade -->
         <template v-if="isTeacher">
            <h2 v-if="grade != null && !isNaN(grade)">Note finale : {{ grade }} / 20</h2>
            <v-divider :thickness="3" class="my-2" />
         </template>

         <!-- attendance (teachers only) -->
         <template v-if="isTeacher">
            <template v-for="group in userGroups" :key="group.uid">
               <StudentGroupAttendance :user_uid="user_uid" :group="group" :editable="editable"/>
            </template>
            <h4>Taux de présence : {{ isNaN(attendanceGrade) ? '-' : attendanceGrade + ' %' }}</h4>
            <v-divider :thickness="3" class="my-2" />
         </template>

         <!-- test results -->
         <h3 class="my-2">Tests</h3>
         <v-table density="compact">
            <thead>
               <tr>
                  <th class="text-left">Nom</th>
                  <th v-if="isTeacher" class="text-left" style="max-width: 50px;">Coefficient</th>
                  <th class="text-left">Réussite</th>
                  <th v-if="isTeacher" class="text-left" style="max-width: 50px;"># maj</th>
                  <th v-if="isTeacher" class="text-left">Note (%)</th>
               </tr>
            </thead>
            <tbody>
               <tr v-for="test in userTests" :key="test?.uid">
                  <td style="max-width: 100px;">{{ test?.name }}</td>
                  <td v-if="isTeacher" style="max-width: 50px;">{{ test?.weight }}</td>
                  <td v-if="testSuccessDate(test?.uid)" style="max-width: 100px;">{{ testSuccessDate(test?.uid) }}</td><td v-else><v-icon>mdi-close</v-icon></td>
                  <td v-if="isTeacher" style="max-width: 50px;">
                     <v-chip size="x-small" v-if="testUpdateCount(test?.uid)" :color="testUpdateCount(test?.uid) < 20 && 'red'">
                        {{ testUpdateCount(test?.uid) }}
                     </v-chip>
                  </td>
                  <td v-if="isTeacher">
                     <v-slider
                        :disabled="!editable"
                        show-ticks="always"
                        thumb-label
                        step="25"
                        tick-size="4"
                        :model-value="testEvaluation(test?.uid)"
                        @end="value => onEvaluationChange(test?.uid, value)"
                     ></v-slider>
                  </td>
               </tr>
            </tbody>
         </v-table>
         <!-- <h4>Évaluation des tests : {{ testGrade + ' %' }}</h4> -->
         <v-divider :thickness="3"/>
      </template>
   </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, computed, watch } from 'vue'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { combineLatest } from 'rxjs'
import { debounceTime } from 'rxjs/operators'
import { useObservable } from '@vueuse/rxjs'

import useExpressXClient from '/src/use/useExpressXClient';

import { useGroup } from '/src/use/useGroup'
import { useUserSHDLTestRelation } from '/src/use/useUserSHDLTestRelation'
import { useBusinessObservables } from '/src/use/useBusinessObservables'

import StudentGroupAttendance from '/src/views/followup/StudentGroupAttendance.vue'

const { app } = useExpressXClient();

const { getObservable: groups$ } = useGroup(app);
const { create: createUserTestRelation, update: updateUserTestEvent } = useUserSHDLTestRelation(app);
const { isTeacher$, userGroups$, userSlots$, userSHDLTests$, userSHDLTestsRelations$, userAttendanceGrade$, userTestGrade$, userGrade$ } = useBusinessObservables(app);

const props = defineProps({
   signedinUid: {
      type: String,
   },
   user_uid: {
      type: String,
   },
   editable: {
      type: Boolean,
      default: true,
   }
})

const isTeacher = useObservable(isTeacher$(props.signedinUid))

const groups = ref()
const userGroups = ref([])
const attendanceGrade = ref(-1)
const testGrade = ref(-1)
const grade = ref()
const userSlots = ref()
const userTests = ref()
const testRelations = ref()

const subscriptions = []
const ready = ref(false)

watch(
   () => props.user_uid,

   async (user_uid) => {

      // unsubscribe from previous user's streams
      while (subscriptions.length) {
         subscriptions.pop().unsubscribe()
      }

      // back to "loading" while the new user's data settles
      ready.value = false

      // À ESSAYER
      // groups = useObservable(groups$());
      subscriptions.push(groups$({}).subscribe(groups_ => {
         groups.value = groups_;
      }))

      subscriptions.push(userGroups$(user_uid).subscribe(userGroups_ => {
         userGroups.value = userGroups_;
      }))

      const now = new Date();

      subscriptions.push(userAttendanceGrade$(props.user_uid, now).subscribe(grade_ => {
         attendanceGrade.value = grade_;
      }))

      subscriptions.push(userTestGrade$(props.user_uid).subscribe(grade_ => {
         testGrade.value = grade_;
      }))

      subscriptions.push(userGrade$(props.user_uid, now).subscribe(grade_ => {
         grade.value = grade_;
      }))

      subscriptions.push(userSlots$(props.user_uid).subscribe(slots => {
         userSlots.value = slots;
      }))

      subscriptions.push(userSHDLTests$(props.user_uid).subscribe(tests => {
         userTests.value = tests;
      }))

      subscriptions.push(userSHDLTestsRelations$(props.user_uid).subscribe(testRelations_ => {
         testRelations.value = testRelations_;
      }))

      // On a cold cache, isTeacher$/userSHDLTests$/userSHDLTestsRelations$ first emit
      // placeholder values (false/[]) synchronously, before the real sync completes.
      // Wait until these streams stop changing before hiding the spinner.
      subscriptions.push(
         combineLatest([
            isTeacher$(props.signedinUid),
            userSHDLTests$(props.user_uid),
            userSHDLTestsRelations$(props.user_uid),
         ]).pipe(
            debounceTime(300),
         ).subscribe(() => {
            ready.value = true
         })
      )
   },
   { immediate: true } // so that it's called on component mount
)

onUnmounted(() => {
   for (const subscription of subscriptions) {
      subscription.unsubscribe()
   }
})

const testSuccessDate = computed(() => (test_uid) => {
   if (!testRelations.value) return null
   const testRelation = testRelations.value.find(testRelation => testRelation.test_uid === test_uid)
   return testRelation?.success_date ? format(testRelation.success_date, "eee d MMMM yyyy, HH'h'mm", { locale: fr }) : null
})

const testEvaluation = computed(() => (test_uid) => {
   if (!testRelations.value) return 0;
   const testRelation = testRelations.value.find(testRelation => testRelation.test_uid === test_uid);
   return testRelation?.evaluation ?? (testRelation?.success_date ? 100 : 0);
})

const testUpdateCount = computed(() => (test_uid) => {
   if (!testRelations.value) return 0;
   const testRelation = testRelations.value.find(testRelation => testRelation.test_uid === test_uid);
   return testRelation?.update_count;
})

async function onEvaluationChange(test_uid, evaluation) {
   // console.log('test_uid, value', test_uid, value)
   if (!testRelations.value) return
   const testRelation = testRelations.value.find(testRelation => testRelation.test_uid === test_uid)
   if (testRelation) {
      await updateUserTestEvent(testRelation.uid, {
         evaluation
      })
   } else {
      await createUserTestRelation({
         user_uid: props.user_uid,
         test_uid,
         evaluation,
      })
   }
}
</script>
