<template>
   <v-card>
      <!-- <v-form v-model="valid" lazy-validation> -->
      <v-form>
         <v-container>
            <v-row>
               <v-col cols="12" sm="6">
                  <v-text-field
                     label="email"
                     :modelValue="user?.email"
                     @input="(e) => onFieldInputDebounced('email', e.target.value)"
                     :rules="emailRules"
                     variant="underlined"
                  ></v-text-field>
               </v-col>
               <v-col cols="12" sm="6">
                  <jcb-upload ref="upload" chunksize="32768" accept="image/*" @upload-chunk="onUploadChunk" @upload-end="onUploadEnd">
                     Cliquez ici ou glissez-déposez une photo
                  </jcb-upload>
               </v-col>
            </v-row>

            <v-row>
               <v-col cols="12" sm="6">
                  <v-text-field
                     label="Nom"
                     :modelValue="user?.lastname"
                     @input="(e) => onFieldInputDebounced('lastname', e.target.value)"
                     variant="underlined"
                  ></v-text-field>
               </v-col>
               <v-col cols="12" sm="6">
                  <v-text-field
                     label="Prénom"
                     :modelValue="user?.firstname"
                     @input="(e) => onFieldInputDebounced('firstname', e.target.value)"
                     variant="underlined"
                  ></v-text-field>
               </v-col>
            </v-row>

            <v-row>
               <v-col xs="12" sm="12">
                  <v-autocomplete
                     variant="underlined"
                     :v-model="usertabs"
                     @update:modelValue="onTabChange"
                     :items="tabs"
                     item-title="title"
                     item-value="uid"
                     label="Onglets"
                     chips
                     multiple
                  ></v-autocomplete>
               </v-col>
            </v-row>

            <v-row>
               <v-col xs="12" sm="12">
                  <v-autocomplete
                     variant="underlined"
                     :modelValue="user?.groups"
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
{{ user }}
   <v-snackbar v-model="snackbar.visible" :timeout="snackbar.timeout" :color="snackbar.color">
      {{ snackbar.text }}
   </v-snackbar>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useDebounceFn } from '@vueuse/core'

import { getUserRef, updateUser, updateUserGroups } from '/src/use/useUser'
import { getGroupListRef } from '/src/use/useGroup'
import { extendExpiration } from "/src/use/useAuthentication"

import 'jcb-upload'
import { app } from '/src/client-app.js'



const props = defineProps({
   userid: {
      type: String,
   },
})


const userid = ref()

watch(() => props.userid, (newValue, oldValue) => {
   console.log('userid', props.userid)
   userid.value = parseInt(props.userid)
}, { immediate: true })

const user = getUserRef(props.userid)

const usertabs = ref({})

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
      extendExpiration()
      await updateUser(userid.value, { [field]: value })
      displaySnackbar({ text: "Modification effectuée avec succès !", color: 'success', timeout: 2000 })
   } catch(err) {
      displaySnackbar({ text: "Erreur lors de la sauvegarde...", color: 'error', timeout: 4000 })
   }
}
const onFieldInputDebounced = useDebounceFn(onFieldInput, 500)

const onTabChange = (value) => {
   console.log('onTabChange', value)
}

const onGroupChange = async (newValues) => {
   extendExpiration()
   await updateUserGroups(userid.value, newValues)

   // const currentIdList = user?.value?.groups.map(g => g.id) || []
   // const currentSet = new Set(currentIdList)
   // const newSet = new Set(newValues)
   // const toAdd = newValues.filter(gid => !currentSet.has(gid))
   // const toRemove = currentIdList.filter(gid => !newSet.has(gid))
   // await updateUserGroups(userid.value, toAdd, toRemove)
}

function displaySnackbar({ text, color, timeout }) {
   snackbar.value = { text, color, timeout, visible: true }
}

async function onUploadChunk(ev) {
   console.log('onUploadChunk', ev.detail)
   try {
      await app.service('file-upload').appendToFile({
         dirKey: 'UPLOAD_AVATARS_PATH',
         filePath: ev.detail.file.name,
         arrayBuffer: ev.detail.arrayBufferSlice,
      })
   } catch(err) {
      console.log('err', err)
   } finally {
   }
}

async function onUploadEnd(ev) {
   console.log('onUploadEnd', ev)
   await updateUser(userid.value, { pict: `/static/upload/avatars/${ev.detail.file.name}` })
}
</script>
