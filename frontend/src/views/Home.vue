<template>
   <v-app class="h-screen overflow-hidden">
      <!-- makes the layout a vertical stack filling the full screen -->
      <div class="d-flex flex-column fill-height">
         <!-- Toolbar (does not grow) -->
         <v-toolbar extended>
            <v-toolbar-title text="SHDL / CRAPS"></v-toolbar-title>

            <template v-slot:append>
               <div class="d-flex ga-2">
                  v. {{ version }}
               </div>

               <div class="d-flex ga-2">
                  <!-- <OnlineButton :isOnline="isConnected" @connect="connect" @disconnect="disconnect" /> -->
                  <GithubLink
                     url="https://github.com/jcbuisson/shdl"
                     svgPath="M12 2C6.477 2 2 6.477 2 12c0 4.419 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.014-1.7-2.782.604-3.369-1.342-3.369-1.342-.455-1.156-1.11-1.464-1.11-1.464-.908-.621.069-.608.069-.608 1.004.071 1.532 1.031 1.532 1.031.892 1.529 2.341 1.088 2.91.832.091-.646.349-1.088.635-1.338-2.221-.253-4.555-1.111-4.555-4.944 0-1.092.39-1.985 1.03-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0 1 12 6.832a9.55 9.55 0 0 1 2.504.337c1.909-1.294 2.748-1.025 2.748-1.025.546 1.377.203 2.394.1 2.647.641.698 1.029 1.591 1.029 2.683 0 3.842-2.337 4.688-4.566 4.936.359.309.679.92.679 1.855 0 1.339-.012 2.419-.012 2.748 0 .267.18.578.688.48C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                  />
               </div>

               <v-menu>
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

         <!-- Fills remaining vertical space -->
         <div class="d-flex flex-column flex-grow-1 overflow-auto">
            <router-view />
         </div>
      </div>
   </v-app>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'

import useExpressXClient from '/src/use/useExpressXClient';

import { expiresAt } from '/src/use/useAppState.js'
import { tabs } from '/src/use/useTabs'
import { useAuthentication } from "/src/use/useAuthentication"
import { useUser, getFullname } from '/src/use/useUser'
import { useUserTabRelation } from '/src/use/useUserTabRelation'

import { map } from 'rxjs'
import { useObservable } from '@vueuse/rxjs'

import router from '/src/router'

import GithubLink from '/src/components/GithubLink.vue'


const { app } = useExpressXClient();
const { restartApp } = useAuthentication(app);
const { getObservable: user$, synchronizeAll: synchronizeAllUser } = useUser(app)
const { getObservable: userTabRelation$ } = useUserTabRelation(app)


const props = defineProps({
   signedinUid: {
      type: String,
   },
})

const isAuthenticated = computed(() => !!expiresAt.value)

const version = ref()

if ('serviceWorker' in navigator) {
   navigator.serviceWorker.ready.then(reg => {
      reg.active.postMessage('GET_VERSION');

      navigator.serviceWorker.addEventListener('message', (event) => {
         if (event.data.type === 'VERSION') {
            console.log("Service Worker version", event.data.version);
            version.value = event.data.version;
         }
      });
   });
}

const userTabs$ = userTabRelation$({ user_uid: props.signedinUid })
   .pipe(
      map(relationList => tabs.filter(tab => relationList.find(relation => relation.tab === tab.uid))),
   )

const userTabs = useObservable(userTabs$)

const signedinUser = useObservable(user$({ uid: props.signedinUid }).pipe(
   map(userList => userList.length > 0 ? userList[0] : null)
))

const signedinUserFullname = computed(() => getFullname(signedinUser.value))


const route = useRoute()
const routeTabUid = ref()
let interval

function updateSelectedTab(tabList = []) {
   const routeTab = route.path.split('/')[3]
   const selectedTab = tabList.find(tab => tab.uid === routeTab)

   if (selectedTab) {
      routeTabUid.value = selectedTab.uid
      return
   }

   const firstTab = tabList.at(0)
   if (firstTab && route.path.replace(/\/$/, '') === `/home/${props.signedinUid}`) {
      routeTabUid.value = firstTab.uid
      router.replace(`/home/${props.signedinUid}/${firstTab.uid}`)
   }
}

watch([userTabs, () => route.path], ([tabList]) => {
   updateSelectedTab(tabList || [])
}, { immediate: true })

onMounted(async () => {
   interval = setInterval(() => {
      if (app.isConnected) app.service('auth').ping() // force backend to send `expireAt` even when user is inactive
   }, 30000)
})

onUnmounted(() => {
   clearInterval(interval)
})

async function logout() {
   await restartApp()
}
</script>
