<template>
   <v-app class="h-screen overflow-hidden">
      <!-- makes the layout a vertical stack filling the full screen -->
      <div class="d-flex flex-column fill-height">
         <!-- Toolbar (does not grow) -->
         <v-toolbar extended>
            <v-toolbar-title :text="`SHDL / CRAPS - ${version}`"></v-toolbar-title>

            <template v-slot:append>
               <div class="d-flex ga-2">
                  <!-- <OnlineButton :isOnline="isConnected" @connect="connect" @disconnect="disconnect" /> -->
                  <GithubLink
                     url="https://github.com/jcbuisson/shdl"
                     svgPath="M12 2A10 10 0 0 0 2 12..."
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
import { useRoute} from 'vue-router'

import useExpressXClient from '/src/use/useExpressXClient';

import { expiresAt } from '/src/use/useAppState.js'
import { tabs } from '/src/use/useTabs'
import { useAuthentication } from "/src/use/useAuthentication"
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


const { app } = useExpressXClient();
const { restartApp } = useAuthentication(app);
const { getObservable: user$, synchronizeAll: synchronizeAllUser } = useUser(app)
const { synchronizeAll: synchronizeAllGroup } = useGroup(app)
const { synchronizeAll: synchronizeAllGroupSlot } = useGroupSlot(app)
const { getObservable: userTabRelation$, synchronizeAll: synchronizeAllUserTabRelation } = useUserTabRelation(app)
const { synchronizeAll: synchronizeAllUserGroupRelation } = useUserGroupRelation(app)
const { synchronizeAll: synchronizeAllUserDocument } = useUserDocument(app)
const { synchronizeAll: synchronizeAllUserDocumentEvent } = useUserDocumentEvent(app)


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

const debouncedUserTabs$ = userTabs$
   .pipe(
      debounceTime(300) // wait until no new value for 500ms
   )

const userTabs = useObservable(userTabs$)

const signedinUser = useObservable(user$({ uid: props.signedinUid }).pipe(
   map(userList => userList.length > 0 ? userList[0] : null)
))

const signedinUserFullname = computed(() => getFullname(signedinUser.value))


const route = useRoute()
const routeTabUid = ref()
let interval
let subscription

onMounted(async () => {
   // const tabFromRoute = tabs.find(tab => route.path.includes(tab.uid))
   // if (tabFromRoute) {
   //    // if route mentions a tab, use it
   //    routeTabUid.value = tabFromRoute.uid
   // } else {
   //    // otherwise, use first tab from values coming out of userTabs$ (with 300ms debounce)
   //    subscription = debouncedUserTabs$.subscribe(([firstTab, ...otheTabs]) => {
   //       router.push(`/home/${props.signedinUid}/${firstTab.uid}`)
   //    })
   // }

   // wait for 500ms and select first tab
   setTimeout(() => {
      console.log('tabs', userTabs.value);
      router.push(`/home/${props.signedinUid}/${userTabs.value.at(0).uid}`)
   }, 500)

   interval = setInterval(() => {
      if (app.isConnected()) app.service('auth').ping() // force backend to send `expireAt` even when user is inactive
   }, 30000)
})

onUnmounted(() => {
   clearInterval(interval)
   // subscription.unsubscribe()
})

async function logout() {
   await restartApp()
}
</script>