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
                     Photo : Drag & drop ou clic ici
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
         </v-container>
         <div class="submit-block">
            <v-btn @click="submit" :disabled="!valid" flat size="large" color="primary" style="min-width: 300px;;">Créer utilisateur</v-btn>
         </div>
      </v-form>
   </v-card>
</template>

<script setup>
import { ref } from 'vue'

import { getFullname, createUser } from '/src/use/useUser.js'

import 'jcb-upload'


const props = defineProps({
   create: {
      type: Boolean,
   },
})

const user = ref({})
const valid = ref()

const emailRules = [
   (v) => !!v || "L'email est obligatoire",
   (v) => /^([a-z0-9_.-]+)@([\da-z.-]+)\.([a-z.]{2,6})$/.test(v) || "l'email doit être valide"
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