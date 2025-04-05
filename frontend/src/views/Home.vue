<template>
   <v-toolbar extended>
      <v-toolbar-title text="SHDL / CRAPS"></v-toolbar-title>

      <template v-slot:append>
         <v-btn size="small" @click="clearCaches">Clear</v-btn>
         <v-btn size="small" @click="toggleCnx">{{ isConnected ? 'déconnexion' : 'reconnexion' }}</v-btn>
         <GithubLink url="https://github.com/jcbuisson/shdl" svgPath="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2"></GithubLink>

         <v-menu :location="location">
            <template v-slot:activator="{ props }">
               <v-btn v-bind="props">
                  {{ isAuthenticated ? signedinUserFullname : "Connexion" }}
               </v-btn>
            </template>

            <v-list>
               <v-list-item  v-if="isAuthenticated">
                  <v-list-item-title @click="logout">Déconnexion</v-list-item-title>
               </v-list-item>
            </v-list>
         </v-menu>
      </template>

      <template v-slot:extension>
         <v-tabs slider-color="indigo" v-model="routeTabIndex">
            <v-tab :to="{path: `/home/${signedinUid}/${tab.uid}`}" router v-for="tab in userTabs" :key="tab.uid">
               {{ tab.name }}
            </v-tab>
         </v-tabs>
      </template>
   </v-toolbar>

   <router-view></router-view>

</template>

<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRoute} from 'vue-router'

import { app, isConnected, connect, disconnect } from '/src/client-app.js'

import { expiresAt } from '/src/use/useAppState.js'
import { restartApp, clearCaches } from "/src/use/useAuthentication"
import { synchronizeWhere as synchronizeUserWhere, synchronizeWhereList as synchronizeUserWhereList, getFirst as getFirstUser, getFullname } from '/src/use/useUser'
import { synchronizeWhereList as synchronizeGroupWhereList } from '/src/use/useGroup'
import { getMany as getManyUserTabRelation, synchronizeWhere as synchronizeUserTabRelationWhere, synchronizeWhereList as synchronizeUserTabRelationWhereList } from '/src/use/useUserTabRelation'
import { synchronizeWhereList as synchronizeUserGroupRelationWhereList } from '/src/use/useUserGroupRelation'
import { tabs } from '/src/use/useTabs'

import router from '/src/router'

import GithubLink from '/src/components/GithubLink.vue'

const props = defineProps({
   signedinUid: {
      type: String,
   },
})

const signedinUser = ref()
const signedinUserFullname = computed(() => getFullname(signedinUser.value))
const userTabs = ref()

const route = useRoute()
const routeTabIndex = ref()

const isAuthenticated = computed(() => !!expiresAt.value)

// synchronize when connection starts or restarts
// (placed here because of import circularity issues)
app.addConnectListener(async () => {
   console.log(">>>>>>>>>>>>>>>> SYNC ALL")
   // order matters
   await synchronizeUserWhereList()
   await synchronizeGroupWhereList()
   await synchronizeUserTabRelationWhereList()
   await synchronizeUserGroupRelationWhereList()
})

let interval

onMounted(async () => {
   // sign-in user
   await synchronizeUserWhere({ uid: props.signedinUid })
   signedinUser.value = await getFirstUser({ uid: props.signedinUid })
   // tab relations of user
   await synchronizeUserTabRelationWhere({ user_uid: props.signedinUid })
   const userTabRelations = await getManyUserTabRelation({ user_uid: props.signedinUid })
   userTabs.value = tabs.filter(tab => userTabRelations.find(relation => relation.tab === tab.uid))

   const indexFromRoute = tabs.findIndex(tab => route.path.includes(tab.uid))
   if (indexFromRoute >= 0) {
      routeTabIndex.value = indexFromRoute
   } else {
      router.push(`/home/${props.signedinUid}/${userTabs.value[0].uid}`)
   }

   interval = setInterval(() => {
      if (isConnected.value) app.service('auth').ping() // force backend to send `expireAt` even when user is inactive
   }, 30000)
})

onUnmounted(() => {
   clearInterval(interval)
})


function toggleCnx() {
   if (isConnected.value) {
      disconnect()
   } else {
      connect()
   }
}

async function logout() {
   await restartApp()
}
</script>
