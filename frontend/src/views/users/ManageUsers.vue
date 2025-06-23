<template>
   <!-- {{ userAndGroupsList }} -->
   <SplitPanel>
      <template v-slot:left-panel>
         <!-- makes the layout a vertical stack filling the full height -->
         <v-card class="d-flex flex-column fill-height">
            <!-- Toolbar (does not grow) -->
            <v-toolbar color="red-darken-4" density="compact">
               <v-btn readonly icon="mdi-magnify" variant="text"></v-btn>
               <v-text-field v-model="filter" single-line></v-text-field>
               <v-btn icon="mdi-plus" variant="text" @click="addUser"></v-btn>
            </v-toolbar>
         
            <!-- Fills remaining vertical space -->
            <div class="d-flex flex-column flex-grow-1 overflow-auto">
               <v-list-item three-line v-for="(userAndGroups, index) in userAndGroupsList" :key="index" :value="userAndGroups?.user" @click="selectUser(userAndGroups.user)" :active="selectedUser?.uid === userAndGroups?.user.uid">
                  <template v-slot:prepend>
                     <v-avatar @click="onAvatarClick(userAndGroups.user)">
                        <v-img :src="userAndGroups?.user.pict"></v-img>
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
         :src="selectedUser?.pict"
      ></v-img>
   </v-dialog>
</template>


<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute} from 'vue-router'
import { Observable, from, map, of, merge, combineLatest, forkJoin, firstValueFrom } from 'rxjs'
import { mergeMap, switchMap, concatMap, scan, tap, catchError, take, debounceTime } from 'rxjs/operators'
import { useObservable } from '@vueuse/rxjs'

import { useUser, getFullname } from '/src/use/useUser'
import { useGroup } from '/src/use/useGroup'
import { useUserGroupRelation } from '/src/use/useUserGroupRelation'
import { selectedUser } from '/src/use/useSelectedUser'
import router from '/src/router'
import { displaySnackbar } from '/src/use/useSnackbar'
import { extendExpiration } from "/src/use/useAuthentication"

import { guardCombineLatest } from '/src/lib/businessObservables'

import SplitPanel from '/src/components/SplitPanel.vue'

const { getObservable: users$, remove: removeUser } = useUser()
const { getObservable: groups$ } = useGroup()
const { getObservable: userGroupRelations$, remove: removeGroupRelation } = useUserGroupRelation()


const props = defineProps({
   signedinUid: {
      type: String,
   },
})

const filter = ref('')

// ?? marche mal si on remplace switchMap par mergeMap
const userAndGroupsList = useObservable(users$({}).pipe(
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
))

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
</script>
