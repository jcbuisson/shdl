<template>
   <SplitPanel>
      <template v-slot:left-panel>
         <v-flex class="xs12 sm5">
            <v-card>
               <v-toolbar color="red-darken-4" density="compact">
                  <v-btn icon="mdi-magnify" variant="text"></v-btn>
                  <v-text-field v-model="filter" single-line></v-text-field>
                  <v-btn icon="mdi-plus" variant="text" @click="createUser"></v-btn>
               </v-toolbar>
            
               <v-list lines="three" :items="items" item-props>
                  <template v-slot:subtitle="{ subtitle }">
                     <div v-html="subtitle"></div>
                     <v-chip size="small">1SN24D</v-chip>
                  </template>
               </v-list>
            </v-card>
         </v-flex>
      </template>

      <template v-slot:right-panel>
         <router-view></router-view>
      </template>
   </SplitPanel>

  <!-- <v-layout row wrap>
      <v-flex class="xs12 sm5">
         <v-card max-width="300">
            <v-toolbar color="red-darken-4" density="compact">
               <v-btn icon="mdi-magnify" variant="text"></v-btn>
               <v-text-field v-model="filter" single-line></v-text-field>
               <v-btn icon="mdi-plus" variant="text" @click="createUser"></v-btn>
            </v-toolbar>
         
            <v-list lines="three" :items="items" item-props>
               <template v-slot:subtitle="{ subtitle }">
                  <div v-html="subtitle"></div>
                  <v-chip size="small">1SN24D</v-chip>
               </template>
            </v-list>
         </v-card>
      </v-flex>

      <v-flex class="xs12 sm7">
         <router-view></router-view>
      </v-flex>
   </v-layout> -->
</template>


<script setup>
import { ref, computed } from 'vue'

import { getUserRef, getUserListRef } from '/src/use/useUser.js'
import router from '/src/router'

import SplitPanel from '/src/components/SplitPanel.vue'


const props = defineProps({
   signedinId: {
      type: String,
   },
})

const filter = ref('')

const userList = getUserListRef('all', {}, ()=>true)

const items = computed(() => {
   if (!userList?.value) return []
   return userList.value.map(user => ({
      prependAvatar: user.pict,
      // title: getFullname(user),
      title: user.lastname,
      subtitle: user.firstname
   }))
})

function createUser() {
   router.push(`/home/${props.signedinId}/users/create`)
}
</script>