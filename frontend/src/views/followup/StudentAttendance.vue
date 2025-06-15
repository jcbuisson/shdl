<template>
   <template v-for="group in userGroups" :key="group.uid">
      <StudentGroupAttendance :user_uid="user_uid" :group="group" />
   </template>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, onUnmounted, computed, watch } from 'vue'
import { Observable, from, map, of, merge, combineLatest, firstValueFrom } from 'rxjs'
import { mergeMap, switchMap, scan, tap, catchError } from 'rxjs/operators'
import { useObservable } from '@vueuse/rxjs'

import { useGroup } from '/src/use/useGroup'
import { useUserGroupRelation } from '/src/use/useUserGroupRelation'

const { getObservable: groups$ } = useGroup()
const { getObservable: userGroupRelations$ } = useUserGroupRelation()

import { guardCombineLatest } from '/src/lib/utilities'

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
let subscription

watch(
   () => props.user_uid,
   async (user_uid) => {
      const groups$ = userGroups$(user_uid)
      subscription = groups$.subscribe(list => {
         userGroups.value = list
      })
   },
   { immediate: true } // so that it's called on component mount
)

onUnmounted(() => {
   subscription && subscription.unsubscribe()
})
</script>
