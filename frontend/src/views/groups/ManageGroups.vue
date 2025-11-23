<template>
   <SplitPanel>
      <template v-slot:left-panel>
         <!-- makes the layout a vertical stack filling the full height -->
         <v-card class="d-flex flex-column fill-height">
         
            <!-- Filter by name (does not grow) -->
            <v-toolbar color="red-darken-4" ddensity="compact">
               <v-text-field v-model="nameFilter" label="Recherche par nom..." class="px-2" single-line clearable></v-text-field>
               <v-btn icon="mdi-plus" variant="text" @click="addGroup"></v-btn>
            </v-toolbar>

            <!-- fills remaining vertical space -->
            <div class="d-flex flex-column flex-grow-1 overflow-auto">
               <v-list-item three-line v-for="(groupAndUsers, index) in filteredSortedGroupAndUsersList":key="index"
                     :value="groupAndUsers.group" @click="selectGroup(groupAndUsers.group)" :active="selectedGroup?.uid === groupAndUsers.group.uid">
                  <v-list-item-title>{{ groupAndUsers?.group?.name }}</v-list-item-title>
                  <v-list-item-subtitle>{{ groupAndUsers?.users.length }} membre{{ groupAndUsers?.users.length > 1 ? 's' : '' }}</v-list-item-subtitle>

                  <template v-slot:append>
                     <v-btn color="grey-lighten-1" icon="mdi-delete" variant="text" @click="deleteGroup(groupAndUsers.group)"></v-btn>
                  </template>
               </v-list-item>
            </div>
         </v-card>
      </template>

      <template v-slot:right-panel>
         <router-view></router-view>
      </template>
   </SplitPanel>
</template>


<script setup>
import { ref, watch, computed } from 'vue'
import { useRoute} from 'vue-router'
import { Observable, from, map, of, merge, combineLatest, forkJoin, firstValueFrom } from 'rxjs'
import { mergeMap, switchMap, concatMap, scan, tap, catchError, take, debounceTime } from 'rxjs/operators'
import { useObservable } from '@vueuse/rxjs'

import useExpressXClient from '/src/use/useExpressXClient';

import { useUser } from '/src/use/useUser'
import { useGroup } from '/src/use/useGroup'
import { useUserGroupRelation } from '/src/use/useUserGroupRelation'
import { useBusinessObservables } from '/src/use/useBusinessObservables'

import router from '/src/router'

import SplitPanel from '/src/components/SplitPanel.vue'
import { displaySnackbar } from '/src/use/useSnackbar'

const { app } = useExpressXClient();
const { getObservable: users$ } = useUser(app)
const { getObservable: groups$, remove: removeGroup } = useGroup(app)
const { findWhere: findGroupWhere, getObservable: userGroupRelations$, remove: removeGroupRelation } = useUserGroupRelation(app)
const { guardCombineLatest } = useBusinessObservables(app)


const props = defineProps({
   signedinUid: {
      type: String,
   },
})

const nameFilter = ref('')

// Trick to force synchronization on all user-group relations, instead of starting dozens of synchronizations, one per group
const allUsers = useObservable(users$({}));
console.log('allUsers', allUsers.value)

// Trick to force synchronization on all user-group relations, instead of starting dozens of synchronizations, one per group
const allGroupUserRelations = useObservable(userGroupRelations$({}));
console.log('allGroupUserRelations', allGroupUserRelations.value)

const groupsAndUsers$ = groups$({}).pipe(
   switchMap(groups => 
      guardCombineLatest(
         groups.map(group =>
            userGroupRelations$({ group_uid: group.uid }).pipe(
               switchMap(relations =>
                  guardCombineLatest(relations.map(relation => users$({ uid: relation.user_uid }).pipe(map(users => users[0]))))
               ),
               map(users => ({ group, users }))
            )
         )
      )
   ),
)

const groupAndUsersList = useObservable(groupsAndUsers$, [])
const sortedGroupAndUsersList = computed(() => groupAndUsersList.value ? groupAndUsersList.value.toSorted((u1, u2) => (u1.name > u2.name) ? 1 : (u1.name < u2.name) ? -1 : 0) : [])

const filteredSortedGroupAndUsersList = computed(() => {
   if (!sortedGroupAndUsersList.value) return []
   const nameFilter_ = (nameFilter.value || '').toLowerCase()
   return sortedGroupAndUsersList.value.filter(gu => {
      if (nameFilter_.length === 0) return true
      if (gu.group.name.toLowerCase().indexOf(nameFilter_) > -1) return true
      return false
   })
})

// const debouncedGroupRelations$ = (group_uid) => userGroupRelations$({ group_uid }).pipe(
//    debounceTime(300) // wait until no new value for 300ms
// )

async function addGroup() {
   router.push(`/home/${props.signedinUid}/groups/create`)
}

const selectedGroup = ref(null)

function selectGroup(group) {
   selectedGroup.value = group
   router.push(`/home/${props.signedinUid}/groups/${group.uid}`)
}

async function deleteGroup(group) {
   // const userGroupRelations = await firstValueFrom(debouncedGroupRelations$(group.uid))
   // group relations are in cache since they are displayed
   const userGroupRelations = await findGroupWhere({ group_uid: group.uid })
   if (window.confirm(`Supprimer le groupe ${group.name} ? (nombre d'utilisateurs membres : ${userGroupRelations.length})`)) {
      try {
         // remove user-group relations
         await Promise.all(userGroupRelations.map(relation => removeGroupRelation(relation.uid)))
         await removeGroup(group.uid)
         router.push(`/home/${props.signedinUid}/groups`)
         displaySnackbar({ text: "Suppression effectuée avec succès !", color: 'success', timeout: 2000 })
      } catch(err) {
         displaySnackbar({ text: "Erreur lors de la suppression...", color: 'error', timeout: 4000 })
      }
   }
}

const route = useRoute()
const routeRegex = /\/home\/([a-z0-9]+)\/groups\/([a-z0-9]+)/

watch(() => [route.path, groupAndUsersList.value], async () => {
   if (!groupAndUsersList.value) return
   const match = route.path.match(routeRegex)
   if (!match) return
   const group_uid = match[2]
   selectedGroup.value = groupAndUsersList.value.find(group => group.uid === group_uid)
}, { immediate: true })
</script>
