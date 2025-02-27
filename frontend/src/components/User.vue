
<template>
         <v-card>
            <v-toolbar color="red-darken-4" density="compact">
               <v-toolbar-title>{{ getFullname(user) }}</v-toolbar-title>
            </v-toolbar>

            <v-form>
               <v-container grid-list-md>
                  <v-layout wrap>

                     <v-flex xs12 sm6>
                        <v-text-field
                           label="E-mail"
                           name='email'
                           autofocus tabindex="1"
                           v-model="user.email"
                           :rules="emailRules"
                           :error-messages="emailErrors"
                           @input="$v.user.email.$touch(); $v.user.$touch()"
                           blur="$v.user.email.$touch(); $v.user.$touch()"
                        ></v-text-field>
                     </v-flex>

                     <!-- <v-flex xs12 sm12>
                        <v-autocomplete
                           label="Rôles"
                           :loading="loading"
                           multiple
                           chips
                           cache-items
                           :items="roles"
                           item-text="params.member_name"
                           item-value="id"
                           :search-input.sync="search"
                           v-model="user.roles"
                           @input="$v.user.roles.$touch(); $v.user.$touch()"
                           blur="$v.user.roles.$touch(); $v.user.$touch()"
                           :error-messages="rolesErrors"
                        ></v-autocomplete>
                     </v-flex> -->
                                          
                     <v-flex xs12 sm5>
                        <v-text-field
                           label="Prénom"
                           v-model="user.firstname"
                           @input="$v.user.$touch()"
                           blur="$v.user.$touch()"
                        ></v-text-field>
                     </v-flex>
                     <v-flex xs12 sm5>
                        <v-text-field
                           label="Nom"
                           v-model="user.lastname"
                           @input="$v.user.$touch()"
                           blur="$v.user.$touch()"
                        ></v-text-field>
                     </v-flex>
                    
                     <v-flex xs12>
                        <v-btn @click="createUser" :disabled="!valid" flat style="width: 100%;">Valider</v-btn>
                     </v-flex>
                  </v-layout>
               </v-container>
            </v-form>
         </v-card>

</template>

<script setup>
import { ref } from 'vue'

import { getFullname } from '/src/use/useUser.js'


const user = ref({})

const emailRules = [
   (v) => !!v || "L'email est obligatoire",
   (v) => /^([a-z0-9_.-]+)@([\da-z.-]+)\.([a-z.]{2,6})$/.test(v) || "l'email doit être valide"
]

function createUser() {
   console.log('createUser')
}
</script>
