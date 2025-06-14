<template>
   STUDENT ATTENDANCE
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, onUnmounted, computed, watch } from 'vue'
import { Observable, from, map, of, merge, combineLatest, firstValueFrom } from 'rxjs'
import { mergeMap, switchMap, scan, tap, catchError } from 'rxjs/operators'
import { useObservable } from '@vueuse/rxjs'

import { useUserGroupRelation } from '/src/use/useUserGroupRelation'
import { useGroupSlot } from '/src/use/useGroupSlot'

const { getObservable: groupSlot$ } = useGroupSlot()
const { getObservable: userGroupRelation$ } = useUserGroupRelation()


function studentSlot$(user_uid: string) {
   return userGroupRelation$({ user_uid }).pipe(
      switchMap(relationList => 
         guardCombineLatest(
            relationList.map(relation =>
               groupSlot$({ group_uid: relation.group_uid })
            )
         )
      ),
   )
}

</script>
