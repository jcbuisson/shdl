<template>
   <v-toolbar color="brown-darken-1" density="compact">
      <v-toolbar-title @click="home">
         SHDL / CRAPS
      </v-toolbar-title>

      <v-spacer></v-spacer>
      <v-btn size="small" @click="toggleCnx">{{ isConnected ? 'disconnect' : 'connect'}}</v-btn>
      <label>
         Université de Toulouse - INPT - ENSEEIHT - JCB
      </label>
      <label>
         v2.0.0
      </label>
      <label>
         {{ reactiveExpiresAt }} {{ expiresAtHHmm }}
      </label>

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
   </v-toolbar>

   <v-tabs v-if="isAuthenticated" aalign-tabs="center" bg-color="brown-darken-1" density="compact" slider-color="yellow"
         :model-value="currentTabIndex"
         @update:modelValue="onTabChange">
         
      <v-tabs-slider color="yellow"></v-tabs-slider>

      <v-tab :to="{path: tab.path}" router v-for="tab in tabs" :key="tab.uid">
         <!-- <v-icon>{{ tab.icon }}</v-icon> -->
         {{ tab.name }}
      </v-tab>
   </v-tabs>

</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { format } from 'date-fns'
import { useRoute } from 'vue-router'

import router from '/src/router'
import { app, isConnected, connect, disconnect } from '/src/client-app.js'

import { findMany, getFullname } from '/src/use/useUser.js'
import { expiresAt } from '/src/use/useAppState.js'
import { restartApp, extendExpiration, clearCaches } from "/src/use/useAuthentication"


const props = defineProps({
   signedinUid: {
      type: String,
   },
})

const signedinUser = ref()

onMounted(async () => {
   const userObservable = await findMany({ uid: props.signedinUid })
   userObservable.subscribe(([user]) => signedinUser.value = user)
})

const signedinUserFullname = computed(() => getFullname(signedinUser.value))

const isAuthenticated = computed(() => !!expiresAt.value)

const route = useRoute()

const tabs = [
   { uid: "a", name: "Utilisateurs", icon: 'mdi-eye', path: `/home/${props.signedinUid}/users` },
   { uid: "b", name: "Groupes", icon: 'mdi-eye', path: `/home/${props.signedinUid}/groups` },
   { uid: "c", name: "Tests", icon: 'mdi-eye', path: '#' },
   { uid: "d", name: "Suivi étudiants", icon: 'mdi-eye', path: '#' },
   { uid: "e", name: "SHDL Sandbox", icon: 'mdi-eye', path: '#' },
   { uid: "f", name: "CRAPS Sandbox", icon: 'mdi-eye', path: '#' },
]

const currentTabIndex = computed(() => {
   const tabIndex = tabs.findIndex(tab => route.path.startsWith(tab.path))
   console.log('tabIndex', tabIndex)
   return tabIndex
})

function onTabChange(tabIndex) {
   extendExpiration()
   const tab = tabs[tabIndex]
   router.push(tab.path)
}

function login() {
   router.push('/login')
}

async function logout() {
   await restartApp()
}

async function home() {
   extendExpiration()
   const user15 = await app.service('user').findUnique({ where: { id: 15 }})
   console.log('user15', user15)
   onTabChange(0)
}

const expiresAtHHmm = computed(() => {
   if (!expiresAt.value) return ''
   return format(new Date(expiresAt.value), "HH:mm:ss")
})

function toggleCnx() {
   if (isConnected.value) {
      disconnect()
   } else {
      connect()
   }
}
</script>

<style>
label{
   margin-left: 10px;
   margin-right: 10px;
   font-size: 16px;
   font-weight: 600;
}
</style>