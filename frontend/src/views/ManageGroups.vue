<template>
   <SplitPanel>
      <template v-slot:left-panel>
         <!-- makes the layout a vertical stack filling the full height -->
         <v-card class="d-flex flex-column fill-height">
            <v-toolbar color="red-darken-4" density="compact">
               <v-btn readonly icon="mdi-magnify" variant="text"></v-btn>
               <v-text-field v-model="filter" single-line></v-text-field>
               <v-btn icon="mdi-plus" variant="text" @click="addGroup"></v-btn>
            </v-toolbar>
         
            <!-- fills remaining vertical space -->
            <div class="d-flex flex-column flex-grow-1 overflow-auto">
               <v-list-item three-line v-for="(group, index) in groupList":key="index" :value="group" @click="selectGroup(group)" :active="selectedGroup?.uid === group?.uid">
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
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute} from 'vue-router'

import { useGroup3 } from '/src/use/useGroup3'
import { useUserGroupRelation } from '/src/use/useUserGroupRelation'
import router from '/src/router'

import SplitPanel from '/src/components/SplitPanel.vue'
import { displaySnackbar } from '/src/use/useSnackbar'

const { addPerimeter: addGroupPerimeter, remove: removeGroup } = useGroup3()
const { addPerimeter: addUserGroupRelationPerimeter, remove: removeGroupRelation } = useUserGroupRelation()


const props = defineProps({
   signedinUid: {
      type: String,
   },
})

const filter = ref('')

const groupList = ref([])

let groupListPerimeter
let userGroupRelationPerimeter

onMounted(async () => {
   groupListPerimeter = await addGroupPerimeter({}, async list => {
      groupList.value = list.toSorted((u1, u2) => (u1.name > u2.name) ? 1 : (u1.name < u2.name) ? -1 : 0)
   })
})

onUnmounted(async () => {
   await groupListPerimeter.remove()
   userGroupRelationPerimeter && await userGroupRelationPerimeter.remove()
})

async function addGroup() {
   router.push(`/home/${props.signedinUid}/groups/create`)
}

const selectedGroup = ref(null)

function selectGroup(group) {
   selectedGroup.value = group
   router.push(`/home/${props.signedinUid}/groups/${group.uid}`)
}

async function deleteGroup(group) {
   userGroupRelationPerimeter = await addUserGroupRelationPerimeter({ group_uid: group.uid })
   const userGroupRelations = await userGroupRelationPerimeter.currentValue()
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
   const match = route.path.match(routeRegex)
   if (!match) return
   const group_uid = match[2]
   selectedGroup.value = groupList.value.find(group => group.uid === group_uid)
}, { immediate: true })
</script>
