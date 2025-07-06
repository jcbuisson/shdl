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
               <v-list-item three-line v-for="(group, index) in filteredSortedGroupList":key="index" :value="group" @click="selectGroup(group)" :active="selectedGroup?.uid === group?.uid">
                  <v-list-item-title>{{ group.name }}</v-list-item-title>

                  <template v-slot:append>
                     <v-btn color="grey-lighten-1" icon="mdi-delete" variant="text" @click="deleteGroup(group)"></v-btn>
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

import { useGroup } from '/src/use/useGroup'
import { useUserGroupRelation } from '/src/use/useUserGroupRelation'
import router from '/src/router'

import SplitPanel from '/src/components/SplitPanel.vue'
import { displaySnackbar } from '/src/use/useSnackbar'

const { getObservable: groups$, remove: removeGroup } = useGroup()
const { findWhere: findGroupWhere, getObservable: userGroupRelations$, remove: removeGroupRelation } = useUserGroupRelation()


const props = defineProps({
   signedinUid: {
      type: String,
   },
})

const nameFilter = ref('')

const groupList = useObservable(groups$({}), [])
const sortedGroupList = computed(() => groupList.value ? groupList.value.toSorted((u1, u2) => (u1.name > u2.name) ? 1 : (u1.name < u2.name) ? -1 : 0) : [])

const filteredSortedGroupList = computed(() => {
   if (!sortedGroupList.value) return []
   const nameFilter_ = (nameFilter.value || '').toLowerCase()
   return sortedGroupList.value.filter(group => {
      if (nameFilter_.length === 0) return true
      if (group.name.toLowerCase().indexOf(nameFilter_) > -1) return true
      return false
   })
})

const debouncedGroupRelations$ = (group_uid) => userGroupRelations$({ group_uid }).pipe(
   debounceTime(300) // wait until no new value for 300ms
)

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
   // group relations are in cache since
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

watch(() => [route.path, groupList.value], async () => {
   if (!groupList.value) return
   const match = route.path.match(routeRegex)
   if (!match) return
   const group_uid = match[2]
   selectedGroup.value = groupList.value.find(group => group.uid === group_uid)
}, { immediate: true })
</script>
