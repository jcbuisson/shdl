<template>
   <v-card>
      <!-- <v-form v-model="valid" lazy-validation> -->
      <v-form>
         <v-container>
            <v-row>
               <v-col cols="12" sm="6">
                  <v-text-field
                     label="email"
                     :modelValue="data.email"
                     @input="(e) => onFieldInputDebounced('email', e.target.value)"
                     :rules="emailRules"
                     variant="underlined"
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
                     @input="(e) => onFieldInputDebounced('lastname', e.target.value)"
                     variant="underlined"
                  ></v-text-field>
               </v-col>
               <v-col cols="12" sm="6">
                  <v-text-field
                     label="Prénom"
                     :modelValue="data.firstname"
                     @input="(e) => onFieldInputDebounced('firstname', e.target.value)"
                     variant="underlined"
                  ></v-text-field>
               </v-col>
            </v-row>

            <v-row>
               <v-col xs="12" sm="12">
                  <v-autocomplete
                     variant="underlined"
                     :v-model="data.tabs"
                     @update:modelValue="onTabChange"
                     :items="tabs"
                     item-title="title"
                     item-value="uid"
                     label="Onglets autorisés"
                     chips
                     multiple
                  ></v-autocomplete>
               </v-col>
            </v-row>

            <v-row>
               <v-col xs="12" sm="12">
                  <v-autocomplete
                     variant="underlined"
                     v-model="data.groups"
                     @update:modelValue="onGroupChange"
                     :items="allGroups"
                     item-title="name"
                     item-value="id"
                     label="Groupes"
                     chips
                     multiple
                  ></v-autocomplete>
               </v-col>
            </v-row>
         </v-container>
      </v-form>
   </v-card>

   <v-snackbar v-model="snackbar.visible" :timeout="snackbar.timeout" :color="snackbar.color">
      {{ snackbar.text }}
   </v-snackbar>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'

import { getUserPromise, updateUser } from '/src/use/useUser.js'
import { getGroupListRef } from '/src/use/useGroup.js'

import 'jcb-upload'


const props = defineProps({
   userid: {
      type: String,
   },
})

const data = ref({})

watch(() => props.userid, async (newValue, oldValue) => {
   const dbValue = await getUserPromise(parseInt(props.userid))
   data.value = { ...dbValue, tabs: [], groups: [] }
}, { immediate: true })

const allGroups = getGroupListRef('all', {}, ()=>true)

const snackbar = ref({})

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

const onFieldInput = async (field, value) => {
   try {
      data.value[field] = value
      await updateUser(parseInt(props.userid), { [field]: value })
      displaySnackbar({ text: "Modification effectuée avec succès !", color: 'success', timeout: 2000 })
   } catch(err) {
      displaySnackbar({ text: "Erreur lors de la sauvegarde...", color: 'error', timeout: 4000 })
   }
}
const onFieldInputDebounced = useDebounceFn(onFieldInput, 500)

const onTabChange = (value) => {
   console.log('onTabChange', value)
}

const onGroupChange = (newValues) => {
   console.log('onGroupChange', newValues)
   const currentSet = new Set(data.groups)
   const newSet = new Set(newValues)
   const toAdd = newValues.filter(g => !currentSet.has(g))
   const toRemove = data.value.groups.filter(g => !newSet.has(g))
   console.log('toAdd', toAdd)
   console.log('toRemove', toRemove)
}

function displaySnackbar({ text, color, timeout }) {
   snackbar.value = { text, color, timeout, visible: true }
}
</script>
