<template>
   <v-form v-model="valid" lazy-validation>
      <v-container>
         <v-row>
            <v-col cols="12" sm="6">
               <v-text-field
                  label="email"
                  :modelValue="data.email"
                  variant="underlined"
                  :rules="emailRules"
                  ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
               <jcb-upload ref="upload" chunksize="32768" accept="image/*">
                  Cliquez ou glissez-déposez une photo ici
               </jcb-upload>
            </v-col>
         </v-row>

         <v-row>
            <v-col cols="12" sm="6">
               <v-text-field
                  label="Nom"
                  :modelValue="data.lastname"
                  variant="underlined"
               ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
               <v-text-field
                  label="Prénom"
                  :modelValue="data.firstname"
                  variant="underlined"
               ></v-text-field>
            </v-col>
         </v-row>

         <v-row>
            <v-col xs="12" sm="12">
               <v-autocomplete
                  variant="underlined"
                  v-model="data.select"
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
   </v-form>
</template>

<script setup>
import { ref, watch } from 'vue'

import { getUserPromise } from '/src/use/useUser.js'

import 'jcb-upload'


const props = defineProps({
   userid: {
      type: String,
   },
})

const data = ref({})

const valid = ref()

const emailRules = [
   (v) => !!v || "L'email est obligatoire",
   (v) => /^([a-z0-9_.-]+)@([\da-z.-]+)\.([a-z.]{2,6})$/.test(v) || "l'email doit être valide"
]

const tabs = [
   { uid: 'user-manager', title: "Gestion utilisateurs" },
   { uid: 'group-manager', title: "Gestion des groupes" },
   { uid: 'test-manager', title: "Gestion des tests" },
   { uid: 'student-manager', title: "Suivi des étudiants" },
   { uid: 'shdl-sandbox', title: "SHDL Sandbox" },
   { uid: 'craps-sandbox', title: "CRAPS sandbox" },
]

watch(() => props.userid, async (newValue, oldValue) => {
   data.value = await getUserPromise(parseInt(props.userid))
}, { immediate: true })

</script>
