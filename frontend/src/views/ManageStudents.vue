<template>
   <SplitPanel>
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
               <v-list-item three-line v-for="(user, index) in userList":key="index" :value="user" @click="selectUser(user)" :active="selectedUser?.uid === user?.uid">
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
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute} from 'vue-router'

import { useUser3 } from '/src/use/useUser3'
import { useGroup3 } from '/src/use/useGroup3'
import { addPerimeter as addUserGroupRelationPerimeter, remove as removeGroupRelation } from '/src/use/useUserGroupRelation'
import { selectedUser } from '/src/use/useSelectedUser'
import router from '/src/router'
import { extendExpiration } from "/src/use/useAuthentication"

import SplitPanel from '/src/components/SplitPanel.vue'

const { addPerimeter: addUserPerimeter } = useUser3()
const { addPerimeter: addGroupPerimeter } = useGroup3()


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

const route = useRoute()
const routeRegex = /home\/[a-z0-9]+\/followup\/([a-z0-9]+)/

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
   router.push(`/home/${props.signedinUid}/followup/${user.uid}`)
}
</script>
