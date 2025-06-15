<template>
   <v-app class="h-screen overflow-hidden">
      <!-- makes the layout a vertical stack filling the full screen -->
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
               <v-tabs slider-color="indigo" v-model="routeTabUid">
                  <template v-for="tab in userTabs" :key="tab.uid">
                     <v-tab
                        :to="{ path: `/home/${signedinUid}/${tab.uid}` }"
                        router
                        :value="tab.uid"
                     >
                        {{ tab.name }}
                     </v-tab>
                  </template>
               </v-tabs>
            </template>
         </v-toolbar>

         {{ suser }}

         <!-- Fills remaining vertical space -->
         <div class="d-flex flex-column flex-grow-1 overflow-auto">
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
import { tabs } from '/src/use/useTabs'
import { restartApp, clearCaches } from "/src/use/useAuthentication"
import { useUser, getFullname } from '/src/use/useUser'
import { useGroup } from '/src/use/useGroup'
import { useGroupSlot } from '/src/use/useGroupSlot'
import { useUserTabRelation } from '/src/use/useUserTabRelation'
import { useUserGroupRelation } from '/src/use/useUserGroupRelation'
import { useUserDocument } from '/src/use/useUserDocument'
import { useUserDocumentEvent } from '/src/use/useUserDocumentEvent'

import { Observable, from, map, of, merge, combineLatest, firstValueFrom, debounceTime } from 'rxjs'
import { useObservable } from '@vueuse/rxjs'

import router from '/src/router'

import GithubLink from '/src/components/GithubLink.vue'
import OnlineButton from '/src/components/OnlineButton.vue'


const { getObservable: user$, synchronizeAll: synchronizeAllUser } = useUser()
const { synchronizeAll: synchronizeAllGroup } = useGroup()
const { synchronizeAll: synchronizeAllGroupSlot } = useGroupSlot()
const { getObservable: userTabRelation$, synchronizeAll: synchronizeAllUserTabRelation } = useUserTabRelation()
const { synchronizeAll: synchronizeAllUserGroupRelation } = useUserGroupRelation()
const { synchronizeAll: synchronizeAllUserDocument } = useUserDocument()
const { synchronizeAll: synchronizeAllUserDocumentEvent } = useUserDocumentEvent()


const props = defineProps({
   signedinUid: {
      type: String,
   },
})

const isAuthenticated = computed(() => !!expiresAt.value)

// synchronize when connection starts or restarts
// (placed here because of import circularity issues)
app.addConnectListener(async () => {
   console.log(">>>>>>>>>>>>>>>> SYNC ALL")
   // order matters
   await synchronizeAllUser()
   await synchronizeAllGroup()
   await synchronizeAllGroupSlot()
   await synchronizeAllUserTabRelation()
   await synchronizeAllUserGroupRelation()
   await synchronizeAllUserDocument()
   await synchronizeAllUserDocumentEvent()
})

const userTabs$ = userTabRelation$({ user_uid: props.signedinUid }).pipe(
   map(relationList => tabs.filter(tab => relationList.find(relation => relation.tab === tab.uid))),
)
const debouncedUserTabs$ = userTabs$.pipe(
   debounceTime(300) // wait until no new value for 300ms
)

const userTabs = useObservable(userTabs$)

const signedinUser = useObservable(user$({ uid: props.signedinUid }).pipe(
   map(userList => userList.length > 0 ? userList[0] : null)
))

const signedinUserFullname = computed(() => getFullname(signedinUser.value))


const route = useRoute()
const routeTabUid = ref()
let interval

onMounted(async () => {
   const tabFromRoute = tabs.find(tab => route.path.includes(tab.uid))
   if (tabFromRoute) {
      routeTabUid.value = tabFromRoute.uid
   } else {
      const userTabList = await firstValueFrom(debouncedUserTabs$)
      router.push(`/home/${props.signedinUid}/${userTabList[0].uid}`)
      // router.push(`/home/${props.signedinUid}`)
   }

   interval = setInterval(() => {
      if (isConnected.value) app.service('auth').ping() // force backend to send `expireAt` even when user is inactive
   }, 30000)
})

onUnmounted(() => {
   clearInterval(interval)
})

async function logout() {
   await restartApp()
}
</script>