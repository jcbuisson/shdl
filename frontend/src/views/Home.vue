<template>
   <!--
      - d-flex flex-column fill-height makes the layout a vertical stack filling the full screen.
      - <v-toolbar> is fixed-height and does not grow.
      - .router-container uses flex: 1 to take up the remaining space.
      - overflow: auto ensures scrollbars appear only if needed, inside router-view.
   -->
   <v-app class="app-layout">
      <div class="d-flex flex-column fill-height">
         <!-- Toolbar (does not grow) -->
         <v-toolbar extended>
            <v-toolbar-title text="SHDL / CRAPS"></v-toolbar-title>

            <template v-slot:append>
               <div class="d-flex ga-2">
                  <v-btn size="small" @click="clearCaches">Clear</v-btn>
                  <OnlineButton :isOnline="isConnected" @connect="connect" @disconnect="disconnect" />
                  <GithubLink
                     url="https://github.com/jcbuisson/shdl"
                     svgPath="M12 2A10 10 0 0 0 2 12..."
                  />
               </div>

               <v-menu :location="location">
                  <template v-slot:activator="{ props }">
                     <v-btn v-bind="props">
                        {{ isAuthenticated ? signedinUserFullname : "Connexion" }}
                     </v-btn>
                  </template>

                  <v-list>
                     <v-list-item v-if="isAuthenticated">
                        <v-list-item-title @click="logout">Déconnexion</v-list-item-title>
                     </v-list-item>
                  </v-list>
               </v-menu>
            </template>

            <template v-slot:extension>
               <v-tabs slider-color="indigo" v-model="routeTabIndex">
                  <v-tab
                     :to="{ path: `/home/${signedinUid}/${tab.uid}` }"
                     router
                     v-for="tab in userTabs"
                     :key="tab.uid"
                  >
                     {{ tab.name }}
                  </v-tab>
               </v-tabs>
            </template>
         </v-toolbar>

         <!-- Fills remaining space -->
         <div class="router-container">
            <router-view />
         </div>
      </div>
   </v-app>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRoute} from 'vue-router'

import { app, isConnected, connect, disconnect } from '/src/client-app.js'

import { expiresAt } from '/src/use/useAppState.js'
import { restartApp, clearCaches } from "/src/use/useAuthentication"
import { addPerimeter as addUserPerimeter, synchronizeAll as synchronizeAllUser, getFullname } from '/src/use/useUser'
import { synchronizeAll as synchronizeAllGroup } from '/src/use/useGroup'
import { addPerimeter as addUserTabRelationPerimeter, synchronizeAll as synchronizeAllUserTabRelation } from '/src/use/useUserTabRelation'
import { synchronizeAll as synchronizeAllUserGroupRelation } from '/src/use/useUserGroupRelation'
import { tabs } from '/src/use/useTabs'

import router from '/src/router'

import GithubLink from '/src/components/GithubLink.vue'
import OnlineButton from '/src/components/OnlineButton.vue'

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
   await synchronizeAllUser()
   await synchronizeAllGroup()
   await synchronizeAllUserTabRelation()
   await synchronizeAllUserGroupRelation()
})

let interval
let userPerimeter
let userTabRelationPerimeter

onMounted(async () => {
   // sign-in user
   userPerimeter = await addUserPerimeter({ uid: props.signedinUid })
   signedinUser.value = await userPerimeter.getByUid(props.signedinUid)
   // tab relations of user
   userTabRelationPerimeter = await addUserTabRelationPerimeter({ user_uid: props.signedinUid })
   const userTabRelations = await userTabRelationPerimeter.currentValue()
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
   userPerimeter.remove()
   userTabRelationPerimeter.remove()
   clearInterval(interval)
})


function toggleCnx() {

   // PAS PLUTÔT ISAUTHENTICATED ?

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

<style scoped>
.app-layout {
  height: 100vh;
  overflow: hidden;
}

.router-container {
  flex: 1 1 auto;
  /* overflow: auto; */
  display: flex;
  flex-direction: column;
}
</style>