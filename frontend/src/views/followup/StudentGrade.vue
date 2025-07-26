<template>
   <div class="pa-2">
      <!-- attendance -->
      <template v-for="group in userGroups" :key="group.uid">
         <StudentGroupAttendance :user_uid="user_uid" :group="group"/>
      </template>

      <!-- test results -->

      <!-- final grade -->
      <div>Note finale : {{ grade }}</div>
   </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, computed, watch } from 'vue'
import { Observable, from, map, of, merge, combineLatest, firstValueFrom } from 'rxjs'
import { mergeMap, switchMap, scan, tap, catchError } from 'rxjs/operators'

import { useGroup } from '/src/use/useGroup'
import { useUserGroupRelation } from '/src/use/useUserGroupRelation'

const { getObservable: groups$ } = useGroup()
const { getObservable: userGroupRelations$ } = useUserGroupRelation()

import { guardCombineLatest, userGrade$ } from '/src/lib/businessObservables'

import StudentGroupAttendance from '/src/views/followup/StudentGroupAttendance.vue'


const props = defineProps({
   user_uid: {
      type: String,
   },
})

function userGroups$(user_uid: string) {
   return userGroupRelations$({ user_uid }).pipe(
      switchMap(relations =>
         guardCombineLatest(relations.map(relation => groups$({ uid: relation.group_uid }).pipe(map(groups => groups[0]))))
      ),
   )
}

const userGroups = ref([])
const grade = ref(-1)

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
   },
   { immediate: true } // so that it's called on component mount
)

onUnmounted(() => {
   for (const subscription of subscriptions) {
      subscription.unsubscribe()
   }
})
</script>
