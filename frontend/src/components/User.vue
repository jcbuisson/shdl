<template>
   <v-card>
      <v-form v-model="valid" lazy-validation>
         <v-container>
            <v-row>
               <v-col cols="12" sm="6">
                  <v-text-field
                     label="email"
                     v-model="user.email"
                     variant="underlined"
                     :rules="emailRules"
                     ></v-text-field>
               </v-col>
               <v-col cols="12" sm="6">
                  <jcb-upload ref="upload" chunksize="32768" accept="application/pdf, image/*">
                     Cliquez ou glissez-déposez une photo ici
                  </jcb-upload>
               </v-col>
            </v-row>

            <v-row>
               <v-col cols="12" sm="6">
                  <v-text-field
                     label="Nom"
                     v-model="user.lastname"
                     variant="underlined"
                  ></v-text-field>
               </v-col>
               <v-col cols="12" sm="6">
                  <v-text-field
                     label="Prénom"
                     v-model="user.firstname"
                     variant="underlined"
                  ></v-text-field>
               </v-col>
            </v-row>

            <v-row>
               <v-col xs="12" sm="12">
                  <v-autocomplete
                     variant="underlined"
                     v-model="select"
                     :items="tabs"
                     item-text="title"
                     item-value="uid"
                     label="Onglets"
                     chips
                     multiple
                  ></v-autocomplete>
               </v-col>
            </v-row>
         </v-container>
         <div class="submit-block">
            <v-btn @click="submit" :disabled="!valid" flat size="large" color="primary" style="min-width: 300px;;">Créer utilisateur</v-btn>
         </div>
      </v-form>
   </v-card>
</template>

<script setup>
import { ref, computed } from 'vue'

import { getUserRef, createUser } from '/src/use/useUser.js'

import 'jcb-upload'


const props = defineProps({
   userid: {
      type: String,
   },
   create: {
      type: Boolean,
   },
})

const user = props.create ? ref() : computed(() => getUserRef(parseInt(props.userid)))

const valid = ref()

const emailRules = [
   (v) => !!v || "L'email est obligatoire",
   (v) => /^([a-z0-9_.-]+)@([\da-z.-]+)\.([a-z.]{2,6})$/.test(v) || "l'email doit être valide"
]

const select = ref()
const tabs = [
   { uid: 'user-manager', title: "Gestion utilisateurs" },
   { uid: 'group-manager', title: "Gestion des groupes" },
   { uid: 'test-manager', title: "Gestion des tests" },
   { uid: 'student-manager', title: "Suivi des étudiants" },
   { uid: 'shdl-sandbox', title: "SHDL Sandbox" },
   { uid: 'craps-sandbox', title: "CRAPS sandbox" },
]

function submit() {
   console.log('createUser')
   createUser(user.value)
}
</script>

<style scoped>
   .submit-block {
      display: flex;
      flex-direction: column;  
      align-items: center;
      padding: 20px;
   }
</style>