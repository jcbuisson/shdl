<template>
   <!-- <div>{{ userAndGroupsAndGradeList }}</div> -->
   <SplitPanel :leftWidth="studentManagerSplitWidth" @resize="onResize">
      <template v-slot:left-panel>
         <!-- makes the layout a vertical stack filling the full height -->
         <v-card class="d-flex flex-column fill-height">
            <!-- Toolbar (does not grow) -->
            <v-toolbar color="red-darken-4" density="compact">
               <v-btn readonly icon="mdi-magnify" variant="text"></v-btn>
               <v-text-field v-model="filter" single-line></v-text-field>
            </v-toolbar>
         
            <!-- Fills remaining vertical space -->
            <div class="d-flex flex-column flex-grow-1 overflow-auto">
               <v-list-item three-line v-for="(ugg, index) in userAndGroupsAndGradeList" :key="index" :value="ugg?.user" @click="selectUser(ugg.user)" :active="selectedUser?.uid === ugg?.user.uid">
                  <template v-slot:prepend>
                     <v-avatar @click="onAvatarClick(ugg.user)">
                        <v-img :src="ugg?.user.pict"></v-img>
                     </v-avatar>
                  </template>
                  <v-list-item-title>{{ ugg?.user.lastname }}</v-list-item-title>
                  <v-list-item-subtitle>{{ ugg?.user.firstname }}</v-list-item-subtitle>
                  <v-list-item-subtitle>
                     <template v-for="group in ugg.groups">
                        <v-chip size="x-small">{{ group?.name }}</v-chip>
                     </template>
                  </v-list-item-subtitle>

                  <template v-slot:append>
                     <v-tooltip text="Note/20">
                        <template v-slot:activator="{ props }">
                           <v-chip v-bind="props" v-if="ugg?.grade >= 0" size="x-small" variant="flat" :color="ugg?.grade < 10 ? 'red' : 'grey'">{{ ugg?.grade }}</v-chip>
                        </template>
                     </v-tooltip>
                  </template>
               </v-list-item>
            </div>
         </v-card>

      </template>

      <template v-slot:right-panel>
         <router-view></router-view>
      </template>
   </SplitPanel>

   <v-dialog v-model="avatarDialog" width="auto">
      <v-img :width="800" aspect-ratio="16/9" cover 
         :src="selectedUser?.pict"
      ></v-img>
   </v-dialog>
</template>


<script setup>
import { ref, watch } from 'vue'
import { useRoute} from 'vue-router'
import { Observable, from, map, of, merge, combineLatest, forkJoin, firstValueFrom } from 'rxjs'
import { mergeMap, switchMap, concatMap, scan, tap, catchError, take, debounceTime } from 'rxjs/operators'
import { useObservable } from '@vueuse/rxjs'

import { useUser } from '/src/use/useUser'
import { useGroup } from '/src/use/useGroup'
import { useUserGroupRelation } from '/src/use/useUserGroupRelation'

import { selectedUser } from '/src/use/useSelectedUser'
import { extendExpiration } from "/src/use/useAuthentication"
import { setStudentManagerSplitWidth, studentManagerSplitWidth } from "/src/use/useAppState"

import router from '/src/router'

import { userGrade$ } from '/src/lib/businessObservables'
import { guardCombineLatest } from '/src/lib/businessObservables'

import SplitPanel from '/src/components/SplitPanel.vue'

const { getObservable: users$ } = useUser()
const { getObservable: groups$ } = useGroup()
const { getObservable: userGroupRelations$ } = useUserGroupRelation()


const props = defineProps({
   signedinUid: {
      type: String,
   },
})

const filter = ref('')

const userAndGroups$ = users$({}).pipe(
   switchMap(users => 
      guardCombineLatest(
         users.map(user =>
            userGroupRelations$({ user_uid: user.uid }).pipe(
               switchMap(relations =>
                  guardCombineLatest(relations.map(relation => groups$({ uid: relation.group_uid }).pipe(map(groups => groups[0]))))
               ),
               map(groups => ({ user, groups }))
            )
         )
      )
   ),
)

const grade$ = users$({}).pipe(
   switchMap(users => 
      guardCombineLatest(
         users.map(user => userGrade$(user.uid)
      )
   ),
))

const userAndGroupsAndGrades$ = combineLatest(userAndGroups$, grade$).pipe(
   map(([userAndGroupsAndGradeList, gradeList]) => userAndGroupsAndGradeList.map((userAndGroups, index) => {
      const grade = gradeList[index]
      return ({ ...userAndGroups, grade })
   }))
)
const userAndGroupsAndGradeList = useObservable(userAndGroupsAndGrades$)


const route = useRoute()
const routeRegex = /home\/[a-z0-9]+\/followup\/([a-z0-9]+)/

watch(() => [route.path, userAndGroupsAndGradeList.value], async () => {
   if (!userAndGroupsAndGradeList.value) return
   const match = route.path.match(routeRegex)
   if (!match) return
   const user_uid = route.path.match(routeRegex)[1]
   const user = userAndGroupsAndGradeList.value.map(userAndGroups => userAndGroups.user).find(user => user.uid === user_uid)
   if (selectedUser.value?.uid !== user.uid) {
      selectUser(user)
   }
}, { immediate: true })


function selectUser(user) {
   extendExpiration()
   selectedUser.value = user
   router.push(`/home/${props.signedinUid}/followup/${user.uid}/activity`)
}

function onResize(width) {
   setStudentManagerSplitWidth(width)
}
</script>
