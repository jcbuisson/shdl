<template>
   <v-toolbar color="brown-darken-1" density="compact">
      <v-toolbar-title @click="home">
         SHDL / CRAPS
      </v-toolbar-title>

      <v-spacer></v-spacer>
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
            <v-btn v-bind="props" @click="login">
               {{ isAuthenticated ? signedinUserFullname : "Connexion" }}
            </v-btn>
         </template>

         <v-list v-if="isAuthenticated">
            <v-list-item>
               <v-list-item-title @click="logout">Déconnexion</v-list-item-title>
            </v-list-item>
         </v-list>
      </v-menu>
   </v-toolbar>

   <v-tabs v-if="isAuthenticated" align-tabs="center" stacked bg-color="brown-darken-1" v-model="currentTab" density="compact" slider-color="yellow">
      <v-tabs-slider color="yellow"></v-tabs-slider>

      <v-tab :to="{path: tab.url}" router v-for="tab in tabs" :key="tab.uid">
         <v-icon>{{ tab.icon }}</v-icon>
         {{ tab.name }}
      </v-tab>
   </v-tabs>

</template>

<script setup>
import { ref, computed } from 'vue'
import { format } from 'date-fns'

import router from '/src/router'
import { app } from '/src/client-app.js'
import { getReactiveUser, getFullname } from '/src/use/useUser.js'
import { expiresAt } from '/src/use/useAppState.js'

const props = defineProps({
   userid: {
      type: String,
   },
})


const expiresAtHHmm = computed(() => {
   if (!expiresAt.value) return ''
   return format(new Date(expiresAt.value), "HH:mm:ss")
})

const signedinUser = getReactiveUser(parseInt(props.userid))
const signedinUserFullname = computed(() => getFullname(signedinUser.value))

const isAuthenticated = computed(() => !!expiresAt.value)

const currentTab = ref()

const tabs = [
   { uid: "a", name: "Utilisateurs", icon: 'mdi-eye', url: `/home/${props.userid}/users` },
   { uid: "b", name: "Groupes", icon: 'mdi-eye', url: '#' },
   { uid: "c", name: "Tests", icon: 'mdi-eye', url: '#' },
   { uid: "d", name: "Suivi étudiants", icon: 'mdi-eye', url: '#' },
   { uid: "e", name: "SHDL Sandbox", icon: 'mdi-eye', url: '#' },
   { uid: "f", name: "CRAPS Sandbox", icon: 'mdi-eye', url: '#' },
]

function login() {
   router.push('/login')
}

async function logout() {
   await app.service('auth').signout()
}

async function home() {
   await app.service('auth').extendExpiration()
   const user15 = await app.service('user').findUnique({ where: { id: 15 }})
   console.log('user15', user15)
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