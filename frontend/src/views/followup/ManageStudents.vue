<template>
   <!-- <div>{{ studentList }}</div> -->
   <SplitPanel :llllleftWidth="studentManagerSplitWidth" @resize="onResize">
      <template v-slot:left-panel>
         <!-- makes the layout a vertical stack filling the full height -->
         <v-card class="d-flex flex-column fill-height">

            <!-- Filter by name (does not grow) -->
            <v-toolbar color="red-darken-4" ddensity="compact">
               <v-text-field v-model="nameFilter" label="Recherche par nom..." class="px-2" single-line clearable></v-text-field>
            </v-toolbar>
         
            <!-- Filter by group (does not grow) -->
            <div class="px-2">
               <v-select
                  variant="underlined"
                  clearable
                  v-model="userGroups"
                  @update:modelValue="onGroupChange"
                  :items="groupList"
                  item-title="name"
                  item-value="uid"
                  label="Recherche par groupe..."
               ></v-select>
            </div>

            <!-- Fills remaining vertical space -->
            <div class="d-flex flex-column flex-grow-1 overflow-auto">
               <div v-if="!userAndGroupsList" class="d-flex flex-column flex-grow-1 align-center justify-center">
                  <v-progress-circular indeterminate color="red-darken-4"></v-progress-circular>
               </div>
               <v-list-item v-else three-line v-for="(ugg, index) in filteredUserAndGroupList" :key="index" :value="ugg?.user" @click="selectUser(ugg.user)" :active="selectedUser?.uid === ugg?.user.uid">
                  <template v-slot:prepend>
                     <v-avatar @click="onAvatarClick(ugg.user)">
                        <v-img :src="userPictPath(ugg.user)"></v-img>
                     </v-avatar>
                  </template>
                  <v-list-item-title>{{ ugg?.user.lastname }}</v-list-item-title>
                  <v-list-item-subtitle>{{ ugg?.user.firstname }}</v-list-item-subtitle>
                  <v-list-item-subtitle>
                     <template v-for="group in ugg.groups">
                        <v-chip size="x-small">{{ group?.name }}</v-chip>
                     </template>
                  </v-list-item-subtitle>
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
         :src="userPictPath(selectedUser)"
      ></v-img>
   </v-dialog>
</template>


<script setup>
import { ref, watch, computed } from 'vue'
import { useRoute} from 'vue-router'
import { Observable, from, map, filter, of, merge, combineLatest, forkJoin, firstValueFrom } from 'rxjs'
import { mergeMap, switchMap, concatMap, scan, tap, catchError, take, debounceTime } from 'rxjs/operators'
import { useObservable } from '@vueuse/rxjs'

import useExpressXClient from '/src/use/useExpressXClient';

import { useGroup } from '/src/use/useGroup'
import { useUserGroupRelation } from '/src/use/useUserGroupRelation'
import { useGroupSlot } from '/src/use/useGroupSlot'
import { useGroupSlotSHDLTestRelation } from '/src/use/useGroupSlotSHDLTestRelation'
import { useUserSlotExcuse } from '/src/use/useUserSlotExcuse'
import { useUserDocumentEvent } from '/src/use/useUserDocumentEvent'
import { useUserSHDLTestRelation } from '/src/use/useUserSHDLTestRelation'
import { useUserTabRelation } from '/src/use/useUserTabRelation'
import { useUserDocument } from '/src/use/useUserDocument'

import { useAuthentication } from "/src/use/useAuthentication"
import { useBusinessObservables } from '/src/use/useBusinessObservables'

import { selectedUser } from '/src/use/useSelectedUser'
import { setStudentManagerSplitWidth, studentManagerSplitWidth } from "/src/use/useAppState"

import router from '/src/router'


import SplitPanel from '/src/components/SplitPanel.vue'

const { app } = useExpressXClient();
const { getObservable: groups$ } = useGroup(app)
const { getObservable: userGroupRelations$ } = useUserGroupRelation(app)
const { getObservable: groupSlots$ } = useGroupSlot(app)
const { getObservable: groupSlotSHDLTestRelations$ } = useGroupSlotSHDLTestRelation(app)
const { getObservable: userSlotExcuses$ } = useUserSlotExcuse(app)
const { getObservable: userDocumentEvents$ } = useUserDocumentEvent(app)
const { getObservable: userSHDLTestRelations$ } = useUserSHDLTestRelation(app)
const { getObservable: userTabRelations$ } = useUserTabRelation(app)
const { getObservable: userDocuments$ } = useUserDocument(app)
const { extendExpiration } = useAuthentication(app)
const { userGrade$, guardCombineLatest, students$ } = useBusinessObservables(app)


const props = defineProps({
   signedinUid: {
      type: String,
   },
})

const userGroups = ref([])
const nameFilter = ref('')
const groupFilter = ref('')

function onGroupChange(uid) {
   groupFilter.value = uid
}

// Create userAndGroups$ first so the essential models (user, user_tab_relation,
// user_group_relation, group) register their {} syncs ahead of the heavy ones.
// The offlinePlugin runs all syncs through a shared mutex, so order matters.
const userAndGroups$ = combineLatest([
   students$(),          // schedules: user sync (1st), user_tab_relation sync (2nd)
   userGroupRelations$({}),  // schedules: user_group_relation sync (3rd)
   groups$({}),          // schedules: group sync (4th)
]).pipe(
   map(([users, allRelations, allGroups]) =>
      users.map(user => ({
         user,
         groups: allRelations
            .filter(rel => rel.user_uid === user.uid)
            .map(rel => allGroups.find(g => g.uid === rel.group_uid))
            .filter(Boolean),
      }))
   ),
)

// groupList for the group filter dropdown (groups$({}) already registered above)
const groupList = useObservable(groups$({}))

// Pre-sync remaining models needed by sub-pages (heavy — run after essential models)
useObservable(userGroupRelations$({}))
useObservable(userTabRelations$({}))
useObservable(groupSlots$({}))
useObservable(groupSlotSHDLTestRelations$({}))
useObservable(userSlotExcuses$({}))
useObservable(userDocumentEvents$({}))
useObservable(userSHDLTestRelations$({}))
useObservable(userDocuments$({}))

const userAndGroupsList = useObservable(userAndGroups$)

const filteredUserAndGroupList = computed(() => {
   if (!userAndGroupsList.value) return []
   const nameFilter_ = (nameFilter.value || '').toLowerCase()
   return userAndGroupsList.value.filter(ug => {
      if (nameFilter_.length === 0) return true
      if (ug.user.firstname.toLowerCase().indexOf(nameFilter_) > -1) return true
      if (ug.user.lastname.toLowerCase().indexOf(nameFilter_) > -1) return true
      return false
   }).filter(ug => {
      if (!groupFilter.value) return true
      if (ug.groups.map(grp => grp.uid).includes(groupFilter.value)) return true
      return false
   }).sort(function(ug1, ug2) {
      const lname1 = ug1.user.lastname.toLowerCase()
      const lname2 = ug2.user.lastname.toLowerCase()
      if (lname1 < lname2) return -1
      if (lname1 > lname2) return 1
      const fname1 = ug1.user.firstname.toLowerCase()
      const fname2 = ug2.user.firstname.toLowerCase()
      if (fname1 < fname2) return -1
      if (fname1 > fname2) return 1
      return 0
   })
})

const route = useRoute()
const routeRegex = /home\/[a-z0-9]+\/followup\/([a-z0-9]+)/

watch(() => [route.path, filteredUserAndGroupList.value], async () => {
   if (!filteredUserAndGroupList.value) return
   const match = route.path.match(routeRegex)
   if (!match) return
   const user_uid = route.path.match(routeRegex)[1]
   const user = filteredUserAndGroupList.value.map(userAndGroups => userAndGroups.user).find(user => user.uid === user_uid)
   if (selectedUser.value?.uid !== user.uid) {
      selectUser(user)
   }
}, { immediate: true })


function selectUser(user) {
   extendExpiration()
   selectedUser.value = user
   router.push(`/home/${props.signedinUid}/followup/${user.uid}/workshop`)
}

function onResize(width) {
   setStudentManagerSplitWidth(width)
}

//////////////////////        AVATAR DISPLAY        //////////////////////

const avatarDialog = ref(false)

function onAvatarClick() {
   avatarDialog.value = true
}

const userPictPath = computed(() => (user) => {
   if (user?.pict) {
      return import.meta.env.VITE_APP_UPLOAD_AVATARS_PATH + user.pict
   }
})
</script>
