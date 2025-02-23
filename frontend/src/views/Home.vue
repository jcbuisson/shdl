<template>
   <v-toolbar color="brown-darken-1" density="compact">
      <v-toolbar-title>
         <h3 @click="home">
            SHDL / CRAPS
         </h3>
      </v-toolbar-title>

      <v-spacer></v-spacer>
      <v-btn flat>
         Université de Toulouse - INPT - ENSEEIHT - JCB
      </v-btn>
      <v-btn flat>
         v2.0.0
      </v-btn>

      <v-menu :location="location">
         <template v-slot:activator="{ props }">
            <v-btn v-bind="props" @click="login">
               {{ isAuthenticated ? getFullname(signedinUser) : "Connexion" }}
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

   <router-view></router-view>

</template>

<script setup>
import { ref } from 'vue'

import router from '/src/router'
import { app } from '/src/client-app.js'
import { userOfId, getFullname } from '/src/use/useUser.js'

const props = defineProps({
   userid: {
      type: String,
   },
})

const signedinUser = userOfId.value(parseInt(props.userid))

setInterval(async () => {
   const x = await app.service('auth').checkAuthentication()
   console.log('x', x)
   isAuthenticated.value = !!x
}, 5000)

const isAuthenticated = ref(false)
const currentTab = ref()

const tabs = [
   { uid: "zz", name: "Utilisateurs", icon: 'mdi-eye', url: `/home/${props.userid}/users` },
   { uid: "zz", name: "Groupes", icon: 'mdi-eye', url: '#' },
   { uid: "zz", name: "Tests", icon: 'mdi-eye', url: '#' },
   { uid: "zz", name: "Suivi étudiants", icon: 'mdi-eye', url: '#' },
   { uid: "aa", name: "SHDL Sandbox", icon: 'mdi-eye', url: '#' },
   { uid: "bb", name: "CRAPS Sandbox", icon: 'mdi-eye', url: '#' },
]

function login() {
   router.push('/login')
}

async function logout() {
   await app.service('auth').signout()
}

function home() {
}
</script>