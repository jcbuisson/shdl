<template>
   <v-layout>
      <!-- <v-flex xs12> -->
         <v-card>
            <v-toolbar color="red-darken-4">
               <v-btn icon><v-icon>mdi-magnify</v-icon></v-btn>
               <v-text-field v-model="filter" hide-details single-line></v-text-field>
               <v-btn icon ripple @click="addUser()">
                  <v-icon>mdi-plus</v-icon>
               </v-btn>
            </v-toolbar>

            <v-list two-line>
               <template v-for="(user, index) in displayedUsers" :key="user.id">
                  <v-list-tile avatar ripple @click="selectUser(user.id)"
                        :class="{ 'red': user.id == selectedUserId, 'lighten-4': user.id == selectedUserId }">
                     <v-list-tile-content>
                        <v-list-tile-title>{{ displayName(user) }}</v-list-tile-title>
                        <v-list-tile-sub-title class="grey--text text--darken-4">{{ displayGroups(user) }}</v-list-tile-sub-title>
                     </v-list-tile-content>
                     <v-list-tile-action>
                        <v-btn icon ripple @click.stop="userToDelete = { ...user }; deleteDialog = true">
                           <v-icon color="grey-lighten-1">mdi-delete</v-icon>
                        </v-btn>
                     </v-list-tile-action>
                  </v-list-tile>
                  <v-divider v-if="index + 1 < displayedUsers.length" :key="user.id + '-'"></v-divider>
               </template>
            </v-list>

            <v-card-text v-if="displayedUsers.length === 0" style="height: 100px;" class="Aligner">
               <v-icon>not_interested</v-icon>
            </v-card-text>
         </v-card>
      <!-- </v-flex> -->

      <v-dialog v-model="deleteDialog" persistent max-width="400">
         <v-card>
            <v-card-title class="headline grey lighten-2">Confirmer</v-card-title>
            <v-card-text>Supprimer {{ displayName(userToDelete) }} ?</v-card-text>
            <v-card-actions>
               <v-spacer></v-spacer>
               <v-btn color="brown darken-2" flat @click.native="deleteDialog = false; deleteUser(userToDelete)">Supprimer</v-btn>
               <v-btn color="brown darken-2" flat @click.native="deleteDialog = false">Annuler</v-btn>
            </v-card-actions>
         </v-card>
      </v-dialog>

   </v-layout>
</template>


<script setup>
import { ref } from 'vue'

const props = defineProps({
   userid: {
      type: String,
   },
})

const displayedUsers = ref([
   { id: 1, firstname: 'JC', lastname: 'BUISSON' },
])
const selectedUserId = ref()
const userToDelete = ref()
const deleteDialog = ref(false)

function displayName(user) {
   if (user.firstname && user.lastname) return user.firstname + ' ' + user.lastname
   return user.firstname || user.lastname
}

function displayGroups(user) {
   return "group1, groups2"
}

function selectUser(userId) {
   selectedUserId.value = userId
}

function addUser() {
}

function deleteUser(user) {
}

</script>