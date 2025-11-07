<template>
   <SplitPanel :leftWidth="userManagerSplitWidth" @resize="onResize">
      <template v-slot:left-panel>
         <!-- makes the layout a vertical stack filling the full height -->
         <v-card class="d-flex flex-column fill-height">

            <!-- Filter by name (does not grow) -->
            <v-toolbar color="red-darken-4">
               <v-text-field v-model="nameFilter" label="Recherche par nom..." class="px-2" single-line clearable></v-text-field>
               <v-btn icon="mdi-plus" variant="text" @click="addUser"></v-btn>
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
               <v-list-item three-line v-for="(userAndGroups, index) in filteredUserAndGroupList" :key="index" :value="userAndGroups?.user" @click="selectUser(userAndGroups.user)" :active="selectedUser?.uid === userAndGroups?.user.uid">
                  <template v-slot:prepend>
                     <v-avatar @click="onAvatarClick(userAndGroups.user)">
                        <v-img :src="userPictPath(userAndGroups.user)"></v-img>
                     </v-avatar>
                  </template>
                  <v-list-item-title>{{ userAndGroups?.user.lastname }}</v-list-item-title>
                  <v-list-item-subtitle>{{ userAndGroups?.user.firstname }}</v-list-item-subtitle>
                  <v-list-item-subtitle>
                     <template v-for="group in userAndGroups.groups">
                        <v-chip size="x-small">{{ group?.name }}</v-chip>
                     </template>
                  </v-list-item-subtitle>

                  <template v-slot:append>
                     <v-btn color="grey-lighten-1" icon="mdi-delete" variant="text" @click="deleteUser(userAndGroups.user)"></v-btn>
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
         :src="userPictPath(selectedUser)"
      ></v-img>
   </v-dialog>
</template>


<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute} from 'vue-router'
import { Observable, from, map, of, merge, combineLatest, forkJoin, firstValueFrom } from 'rxjs'
import { mergeMap, switchMap, concatMap, scan, tap, catchError, take, debounceTime } from 'rxjs/operators'
import { useObservable } from '@vueuse/rxjs'

import useExpressXClient from '/src/use/useExpressXClient';

import { useUser, getFullname } from '/src/use/useUser'
import { useGroup } from '/src/use/useGroup'
import { useUserGroupRelation } from '/src/use/useUserGroupRelation'
import { useAuthentication } from '/src/use/useAuthentication'

import { selectedUser } from '/src/use/useSelectedUser'
import { displaySnackbar } from '/src/use/useSnackbar'
import { setUserManagerSplitWidth, userManagerSplitWidth } from "/src/use/useAppState"
import { useBusinessObservables } from '/src/use/useBusinessObservables'

import router from '/src/router'

import SplitPanel from '/src/components/SplitPanel.vue'

const { app } = useExpressXClient();
const { getObservable: users$, remove: removeUser } = useUser(app)
const { getObservable: groups$ } = useGroup(app)
const { getObservable: userGroupRelations$, remove: removeGroupRelation } = useUserGroupRelation(app)
const { extendExpiration } = useAuthentication(app)
const { guardCombineLatest } = useBusinessObservables(app)


const props = defineProps({
   signedinUid: {
      type: String,
   },
})

const groupList = useObservable(groups$({}))
const userGroups = ref([])

const nameFilter = ref('')
const groupFilter = ref('')

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
const userAndGroupsList = useObservable(userAndGroups$)

function onGroupChange(uid) {
   groupFilter.value = uid
}

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


async function addUser() {
   router.push(`/home/${props.signedinUid}/users/create`)
}

const route = useRoute()
const routeRegex = /home\/[a-z0-9]+\/users\/([a-z0-9]+)/

watch(() => [route.path, userAndGroupsList.value], async () => {
   if (!userAndGroupsList.value) return
   selectedUser.value = null
   const match = route.path.match(routeRegex)
   if (!match) return
   const user_uid = route.path.match(routeRegex)[1]
   const user = userAndGroupsList.value.map(userAndGroups => userAndGroups.user).find(user => user.uid === user_uid)
   selectUser(user)
}, { immediate: true })


function selectUser(user) {
   extendExpiration()
   selectedUser.value = user
   router.push(`/home/${props.signedinUid}/users/${user.uid}`)
}

async function deleteUser(user) {
   const userGroupRelations = await firstValueFrom(userGroupRelations$({ user_uid: user.uid }))
   console.log('userGroupRelations', userGroupRelations)
   if (window.confirm(`Supprimer ${getFullname(user)} ?`)) {
      try {
         // remove user-group relations
         await Promise.all(userGroupRelations.map(relation => removeGroupRelation(relation.uid)))
         // remove user
         await removeUser(user.uid)
         router.push(`/home/${props.signedinUid}/users`)
         displaySnackbar({ text: "Suppression effectuée avec succès !", color: 'success', timeout: 2000 })
      } catch(err) {
         displaySnackbar({ text: "Erreur lors de la suppression...", color: 'error', timeout: 4000 })
      }
   }
}

function onResize(width) {
   setUserManagerSplitWidth(width)
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
