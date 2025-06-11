<template>
   {{ userList2 }}
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
               <v-list-item three-line v-for="(user, index) in userList" :key="index" :value="user" @click="selectUser(user)" :active="selectedUser?.uid === user?.uid">
                  <template v-slot:prepend>
                     <v-avatar @click="onAvatarClick(user)">
                        <v-img :src="user.pict"></v-img>
                     </v-avatar>
                  </template>
                  <v-list-item-title>{{ user.lastname }}</v-list-item-title>
                  <v-list-item-subtitle>{{ user.firstname }}</v-list-item-subtitle>
                  <v-list-item-subtitle>
                     <template v-for="group in user.groups">
                        <v-chip size="x-small">{{ group?.name }}</v-chip>
                     </template>
                  </v-list-item-subtitle>

                  <template v-slot:append>
                     <v-btn color="grey-lighten-1" icon="mdi-delete" variant="text" @click="deleteUser(user)"></v-btn>
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
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute} from 'vue-router'
import { Observable, from, map, of, merge, combineLatest, forkJoin } from 'rxjs'
import { mergeMap, switchMap, concatMap, scan, tap, catchError } from 'rxjs/operators'
import { useObservable } from '@vueuse/rxjs'

import { useUser, getFullname } from '/src/use/useUser'
import { useGroup } from '/src/use/useGroup'
import { useUserGroupRelation } from '/src/use/useUserGroupRelation'
import { selectedUser } from '/src/use/useSelectedUser'
import router from '/src/router'
import { displaySnackbar } from '/src/use/useSnackbar'
import { extendExpiration } from "/src/use/useAuthentication"

import SplitPanel from '/src/components/SplitPanel.vue'

const { getObservable: users$, addPerimeter: addUserPerimeter, remove: removeUser } = useUser()
const { getObservable: groups$, addPerimeter: addGroupPerimeter } = useGroup()
const { getObservable: userGroupRelations$, addPerimeter: addUserGroupRelationPerimeter, remove: removeGroupRelation } = useUserGroupRelation()


const props = defineProps({
   signedinUid: {
      type: String,
   },
})

const filter = ref('')
const userList = ref([])
const perimeters = []

onMounted(async () => {
   // ensures that all groups are in cache
   const groupListPerimeter = await addGroupPerimeter({})
   perimeters.push(groupListPerimeter)

   perimeters.push(await addUserPerimeter({}, async list => {
      userList.value = list.toSorted((u1, u2) => (u1.lastname > u2.lastname) ? 1 : (u1.lastname < u2.lastname) ? -1 : 0)

      for (const user of userList.value) {
         perimeters.push(await addUserGroupRelationPerimeter({ user_uid: user.uid }, async relationList => {
            user.groups = []
            for (const group_uid of relationList.map(relation => relation.group_uid)) {
               const group = await groupListPerimeter.getByUid(group_uid)
               user.groups.push(group)
            }
         }))
      }
   }))
})

onUnmounted(async () => {
   for (const perimeter of perimeters) {
      await perimeter.remove()
   }
})

function guardCombineLatest<T>(observables: Array<any>): T {
   if (observables.length === 0) {
      // If the array is empty, immediately return an Observable that emits an empty array
      return of([]) as T
   } else {
      // Otherwise, proceed with combineLatest
      return combineLatest(observables) as T
   }
}

const userList2 = useObservable(users$({}).pipe(
   mergeMap(userList => 
      guardCombineLatest(
         userList.map(user =>
            userGroupRelations$({ user_uid: user.uid }).pipe(
               mergeMap(relations =>
                  guardCombineLatest(relations.map(relation => groups$({ uid: relation.group_uid }).pipe(map(groups => groups[0]))))
               ),
               map(relations => ({ user, relations }))
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

watch(() => [route.path, userList.value], async () => {
   const match = route.path.match(routeRegex)
   if (match) {
      const user_uid = route.path.match(routeRegex)[1]
      selectedUser.value = userList.value.find(user => user.uid === user_uid)
   }
}, { immediate: true })


function selectUser(user) {
   extendExpiration()
   selectedUser.value = user
   router.push(`/home/${props.signedinUid}/users/${user.uid}`)
}

async function deleteUser(user) {
   const userGroupRelationPerimeter = await addUserGroupRelationPerimeter({ user_uid: user.uid })
   perimeters.push(userGroupRelationPerimeter)
   const userGroupRelations = await userGroupRelationPerimeter.currentValue()
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
