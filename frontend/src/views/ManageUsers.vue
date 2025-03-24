<template>
   <SplitPanel>
      <template v-slot:left-panel>
         <v-card>
            <v-toolbar color="red-darken-4" density="compact">
               <v-btn readonly icon="mdi-magnify" variant="text"></v-btn>
               <v-text-field v-model="filter" single-line></v-text-field>
               <v-btn icon="mdi-plus" variant="text" @click="addUser"></v-btn>
            </v-toolbar>
         
            <div :style="{ height: `calc(100vh - 160px)`, 'overflow-y': 'auto' }">
               <v-list-item three-line v-for="(user, index) in userList":key="index" :value="user" @click="selectUser(user)" :active="selectedUser?.uid === user?.uid">
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
import { ref, onMounted, onUnmounted } from 'vue'

import { findMany as findManyUser, getFullname, create as createUser, remove as removeUser } from '/src/use/useUser.js'
import { extendExpiration } from "/src/use/useAuthentication"
import router from '/src/router'

import SplitPanel from '/src/components/SplitPanel.vue'
// import SplitPanel from 'jcb-vertical-split-panel'


const props = defineProps({
   signedinUid: {
      type: String,
   },
})

const filter = ref('')

const userList = ref([])
let userListSubscription

onMounted(async () => {
   const userObservable = await findManyUser({})
   userListSubscription = userObservable.subscribe(list => {
      userList.value = list.toSorted((u1, u2) => (u1.lastname > u2.lastname) ? 1 : (u1.lastname < u2.lastname) ? -1 : 0)
   })
})

onUnmounted(() => {
   userListSubscription.unsubscribe()
})

async function addUser() {
   const user = await createUser({})
   selectUser(user)
}

const selectedUser = ref(null)

function selectUser(user) {
   extendExpiration()
   selectedUser.value = user
   router.push(`/home/${props.signedinUid}/users/${user.uid}`)
}

async function deleteUser(user) {
   extendExpiration()
   if (window.confirm(`Supprimer ${getFullname(user)} ?`)) {
      await removeUser(user.uid)
      router.push(`/home/${props.signedinUid}/users`)
   }
}

const avatarDialog = ref(false)

function onAvatarClick() {
   avatarDialog.value = true
}
</script>
