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
                  <div style="display: flex; width: 100%; justify-content: space-between; align-items: center; gap: 10px;">
                     <v-avatar size="80" @click="onAvatarClick(user)">
                        <v-img :src="user?.pict"></v-img>
                     </v-avatar>
                     <jcb-upload ref="upload" chunksize="32768" accept="image/*" @upload-start="onUploadStart" @upload-chunk="onUploadChunk" @upload-end="onUploadEnd">
                        Cliquez ici ou glissez-déposez une photo
                     </jcb-upload>
                  </div>
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

   <v-dialog v-model="avatarDialog" width="auto">
      <v-img :width="800" aspect-ratio="16/9" cover 
         :src="user?.pict"
      ></v-img>
   </v-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { v4 as uuidv4 } from 'uuid'

import { getUserObservable, updateUser, updateUserTabs } from '/src/use/useUser'
import { selectObservable as selectGroupObservable } from '/src/use/useGroup'
import { extendExpiration } from "/src/use/useAuthentication"

import 'jcb-upload'
import { app } from '/src/client-app.js'


const props = defineProps({
   user_uid: {
      type: String,
   },
})

const user = ref()
const allGroups = ref([])

watch(() => props.user_uid, async (user_uid) => {
   const userObservable = getUserObservable(user_uid)
   userObservable.subscribe(user_ => user.value = user_)
}, { immediate: true })

const groupListObservable = selectGroupObservable({})
groupListObservable.subscribe(groupList => allGroups.value = groupList)

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
      await updateUser(user_uid.value, { [field]: value })
      displaySnackbar({ text: "Modification effectuée avec succès !", color: 'success', timeout: 2000 })
   } catch(err) {
      displaySnackbar({ text: "Erreur lors de la sauvegarde...", color: 'error', timeout: 4000 })
   }
}
const onFieldInputDebounced = useDebounceFn(onFieldInput, 500)

const onTabChange = async (tabs) => {
   try {
      extendExpiration()
      await updateUserTabs(user_uid.value, tabs)
      displaySnackbar({ text: "Modification effectuée avec succès !", color: 'success', timeout: 2000 })
   } catch(err) {
      displaySnackbar({ text: "Erreur lors de la sauvegarde...", color: 'error', timeout: 4000 })
   }
}

const onGroupChange = async (newValues) => {
   try {
      extendExpiration()
      // await updateUserGroups(user_uid.value, newValues)
      displaySnackbar({ text: "Modification effectuée avec succès !", color: 'success', timeout: 2000 })
   } catch(err) {
      displaySnackbar({ text: "Erreur lors de la sauvegarde...", color: 'error', timeout: 4000 })
   }
}

function displaySnackbar({ text, color, timeout }) {
   snackbar.value = { text, color, timeout, visible: true }
}


//////////////////////        AVATAR UPLOAD        //////////////////////

let avatarPath

async function onUploadStart(ev) {
   let extension = ev.detail.file.type.substring(6)
   if (extension === 'svg+xml') extension = 'svg'
   const uuid = uuidv4()
   avatarPath = `avatar-${props.user_uid}-${uuid}.${extension}`
}

async function onUploadChunk(ev) {
   const type = ev.detail.file.type // ex: image/jpg
   if (type.startsWith('image')) {
      const extension = ev.detail.file.type.substring(6)
      try {
         await app.service('file-upload').appendToFile({
            dirKey: 'UPLOAD_AVATARS_PATH',
            filePath: avatarPath,
            arrayBuffer: ev.detail.arrayBufferSlice,
         })
      } catch(err) {
         console.log('err', err)
      } finally {
      }
   } else {
      alert("Fournissez un fichier avec une extension .jpg, .jpeg, .png, .gif, .webp")
   }
}

async function onUploadEnd(ev) {
   await updateUser(user_uid.value, { pict: `/static/upload/avatars/${avatarPath}` })
   displaySnackbar({ text: "Modification effectuée avec succès !", color: 'success', timeout: 2000 })
}

//////////////////////        AVATAR DISPLAY        //////////////////////

const avatarDialog = ref(false)

function onAvatarClick() {
   avatarDialog.value = true
}
</script>
