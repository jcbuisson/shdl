<template>
   <SplitPanel>
      <template v-slot:left-panel>
         <v-card>
            <v-toolbar color="red-darken-4" density="compact">
               <v-btn icon="mdi-magnify" variant="text"></v-btn>
               <v-text-field v-model="filter" single-line></v-text-field>
               <v-btn icon="mdi-plus" variant="text" @click="createUser"></v-btn>
            </v-toolbar>
         
            <div :style="{ height: `calc(100vh - 160px)`, 'overflow-y': 'auto' }">
               <v-list-item three-line v-for="(user, index) in userList":key="index" :value="user" @click="selectUser(user)" :active="selectedUser?.id === user?.id">
                  <template v-slot:prepend>
                     <v-avatar>
                        <v-img :src="user.pict"></v-img>
                     </v-avatar>
                  </template>
                  <v-list-item-title>{{ user.lastname }}</v-list-item-title>
                  <v-list-item-subtitle>{{ user.firstname }}</v-list-item-subtitle>
                  <v-list-item-subtitle>
                     <v-chip size="x-small">1SN24D</v-chip>
                  </v-list-item-subtitle>
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
import { ref, computed } from 'vue'

import { getUserListRef } from '/src/use/useUser.js'
import { extendExpiration } from "/src/use/useAuthentication"
import router from '/src/router'

import SplitPanel from '/src/components/SplitPanel.vue'


const props = defineProps({
   signedinId: {
      type: String,
   },
})

const filter = ref('')

const userList = getUserListRef('all', {}, ()=>true)

function createUser() {
   router.push(`/home/${props.signedinId}/users/create`)
}

const selectedUser = ref(null)

function selectUser(user) {
   extendExpiration()
   selectedUser.value = user
   router.push(`/home/${props.signedinId}/users/${user.id}`)
}

</script>
