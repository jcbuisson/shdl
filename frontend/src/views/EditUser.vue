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
                     :modelValue="user?.tabs?.map(uid => tabs.find(tab => (tab.uid === uid)))"
                     @update:modelValue="onTabChange"
                     :items="tabs"
                     item-title="name"
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

   <v-snackbar v-model="snackbar.visible" :timeout="snackbar.timeout" :color="snackbar.color">
      {{ snackbar.text }}
   </v-snackbar>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useDebounceFn } from '@vueuse/core'

import { getUserRef, getUserPromise, updateUser, updateUserGroups } from '/src/use/useUser'
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

// const user = getUserRef(parseInt(props.userid))
const user = ref()

watch(() => props.userid, async (newValue, oldValue) => {
   console.log('userid', props.userid)
   userid.value = parseInt(props.userid)
   user.value = await getUserPromise(userid.value)
}, { immediate: true })

const usertabs = ref({})

const allGroups = getGroupListRef('all', {}, ()=>true)

const snackbar = ref({})

const emailRules = [
   (v) => !!v || "L'email est obligatoire",
   (v) => /^([a-z0-9_.-]+)@([\da-z.-]+)\.([a-z.]{2,6})$/.test(v) || "l'email doit être valide"
]

const tabs = [
   { uid: 'user_management', name: "Gestion utilisateurs" },
   { uid: 'group_management', name: "Gestion des groupes" },
   { uid: 'test_management', name: "Gestion des tests" },
   { uid: 'student_followup', name: "Suivi des étudiants" },
   { uid: 'shdl_sandbox', name: "SHDL Sandbox" },
   { uid: 'craps_sandbox', name: "CRAPS sandbox" },
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
}

function displaySnackbar({ text, color, timeout }) {
   snackbar.value = { text, color, timeout, visible: true }
}

async function onUploadChunk(ev) {
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
   await updateUser(userid.value, { pict: `/static/upload/avatars/${ev.detail.file.name}` })
}
</script>
