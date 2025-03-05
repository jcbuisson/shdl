<template>
   <SplitPanel>
      <template v-slot:left-panel>
         <v-card>
            <v-toolbar color="red-darken-4" density="compact">
               <v-btn readonly icon="mdi-magnify" variant="text"></v-btn>
               <v-text-field v-model="filter" single-line></v-text-field>
               <v-btn icon="mdi-plus" variant="text" @click="createUser"></v-btn>
            </v-toolbar>
         
            <div :style="{ height: `calc(100vh - 160px)`, 'overflow-y': 'auto' }">
               <v-list-item three-line v-for="(user, index) in userList":key="index" :value="user" @click="selectUser(user)" :active="selectedUser?.id === user?.id">
                  <template v-slot:prepend>
                     <v-avatar @click="onAvatarClick(user)">
                        <v-img :src="user.pict"></v-img>
                     </v-avatar>
                  </template>
                  <v-list-item-title>{{ user.lastname }}</v-list-item-title>
                  <v-list-item-subtitle>{{ user.firstname }}</v-list-item-subtitle>
                  <v-list-item-subtitle>
                     <template v-for="group in user.groups">
                        <v-chip size="x-small">{{ group.name }}</v-chip>
                     </template>
                  </v-list-item-subtitle>

                  <template v-slot:append>
                     <v-btn color="grey-lighten-1" icon="mdi-delete" variant="text" @click="deleteUser(user)"></v-btn>
                  </template>
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
import { ref } from 'vue'

import { getUserListObservable, getFullname, removeUser } from '/src/use/useUser.js'
import { extendExpiration } from "/src/use/useAuthentication"
import router from '/src/router'

import SplitPanel from '/src/components/SplitPanel.vue'


const props = defineProps({
   signedinId: {
      type: String,
   },
})

const filter = ref('')

const userList = ref([])

const userListObservable = getUserListObservable('all', {}, ()=>true)
userListObservable.subscribe(list => {
   userList.value = list.toSorted((u1, u2) => (u1.lastname > u2.lastname) ? 1 : (u1.lastname < u2.lastname) ? -1 : 0)
})

function createUser() {
   router.push(`/home/${props.signedinId}/users/create`)
}

const selectedUser = ref(null)

function selectUser(user) {
   extendExpiration()
   selectedUser.value = user
   router.push(`/home/${props.signedinId}/users/${user.id}`)
}

async function deleteUser(user) {
   extendExpiration()
   if (window.confirm(`Supprimer ${getFullname(user)} ?`)) {
      await removeUser(user.id)
      router.push(`/home/${props.signedinId}/users`)
   }
}

const avatarDialog = ref(false)

function onAvatarClick() {
   avatarDialog.value = true
}
</script>
