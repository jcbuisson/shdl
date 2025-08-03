<template>
   <v-card>
      <v-form>
         <v-container>
            <v-row>
               <v-col cols="12" md="3">
                  <v-text-field
                     label="email"
                     :modelValue="user?.email"
                     @input="(e) => onFieldInputDebounced('email', e.target.value)"
                     :rules="emailRules"
                     variant="underlined"
                  ></v-text-field>
               </v-col>
               <v-col cols="12" md="3" class="d-flex align-center">
                  <v-btn flat color="primary" @click="validateEmail">Reset mot de passe...</v-btn>
               </v-col>
               <v-col cols="12" md="6">
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
               <v-col cols="12" md="6">
                  <v-text-field
                     label="Nom"
                     :modelValue="user?.lastname"
                     @input="(e) => onFieldInputDebounced('lastname', e.target.value)"
                     variant="underlined"
                  ></v-text-field>
               </v-col>
               <v-col cols="12" md="6">
                  <v-text-field
                     label="Prénom"
                     :modelValue="user?.firstname"
                     @input="(e) => onFieldInputDebounced('firstname', e.target.value)"
                     variant="underlined"
                  ></v-text-field>
               </v-col>
            </v-row>

            <v-row>
               <v-col xs="12" md="12">
                  <v-select
                     variant="underlined"
                     v-model="userTabs"
                     @update:modelValue="onTabChange"
                     :items="tabs"
                     item-title="name"
                     item-value="uid"
                     label="Onglets"
                     chips
                     multiple
                  ></v-select>
               </v-col>
            </v-row>

            <v-row>
               <v-col xs="12" md="12">
                  <v-select
                     variant="underlined"
                     v-model="userGroups"
                     @update:modelValue="onGroupChange"
                     :items="groupList"
                     item-title="name"
                     item-value="uid"
                     label="Groupes"
                     chips
                     multiple
                  ></v-select>
               </v-col>
            </v-row>

            <v-row>
               <v-textarea
                  label="Notes"
                  :modelValue="user?.notes"
                  @input="(e) => onFieldInputDebounced('notes', e.target.value)"
               ></v-textarea>
            </v-row>

         </v-container>
      </v-form>
   </v-card>

   <!-- avatar modal display-->
   <v-dialog v-model="avatarDialog" width="auto">
      <v-img :width="800" aspect-ratio="16/9" cover 
         :src="user?.pict"
      ></v-img>
   </v-dialog>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useObservable } from '@vueuse/rxjs'
import { map } from 'rxjs'

import { useUser } from '/src/use/useUser'
import { useGroup } from '/src/use/useGroup'
import { useUserTabRelation } from '/src/use/useUserTabRelation'
import { useUserGroupRelation } from '/src/use/useUserGroupRelation'

import { extendExpiration } from '/src/use/useAuthentication'
import { displaySnackbar } from '/src/use/useSnackbar'
import { tabs } from '/src/use/useTabs'

import { app } from '/src/client-app.js'

const { getObservable: users$, update: updateUser } = useUser()
const { getObservable: groups$ } = useGroup()
const { getObservable: userTabRelation$, tabDifference, create: createUserTabRelation, remove: removeUserTabRelation } = useUserTabRelation()
const { getObservable: userGroupRelations$, groupDifference, create: createUserGroupRelation, remove: removeUserGroupRelation } = useUserGroupRelation()


const props = defineProps({
   user_uid: {
      type: String,
   },
})

const emailRules = [
   (v) => !!v || "L'email est obligatoire",
   (v) => /^([a-z0-9_.-]+)@([\da-z.-]+)\.([a-z.]{2,6})$/.test(v) || "l'email doit être valide"
]

const groupList = useObservable(groups$({}))

const user = ref()
const userGroups = ref([])
const userTabs = ref([])

let usersSubscription
let userGroupRelationSubscription
let userTabRelationSubscription

watch(() => props.user_uid, async (user_uid) => {
   
   // handle unsubscription carefully - otherwise, a previous subscription for another user_uid will interfere with current subscription
   if (usersSubscription) usersSubscription.unsubscribe()
   usersSubscription = users$({ uid: user_uid }).subscribe(userList => {
      if (userList.length === 0) return
      user.value = userList[0]
   })

   if (userGroupRelationSubscription) userGroupRelationSubscription.unsubscribe()
   userGroupRelationSubscription = userGroupRelations$({ user_uid }).pipe(
      map(relationList => relationList.map(relation => relation.group_uid))
   ).subscribe(groupUIDs => {
      userGroups.value = groupUIDs
   })

   if (userTabRelationSubscription) userTabRelationSubscription.unsubscribe()
   userTabRelationSubscription = userTabRelation$({ user_uid }).pipe(
      map(relationList => tabs.filter(tab => relationList.find(relation => relation.tab === tab.uid))),
   ).subscribe(tabList => {
      userTabs.value = tabList
   })

},
   { immediate: true } // so that it's called on component mount
)

onUnmounted(() => {
   if (usersSubscription) usersSubscription.unsubscribe()
   if (userGroupRelationSubscription) userGroupRelationSubscription.unsubscribe()
   if (userTabRelationSubscription) userTabRelationSubscription.unsubscribe()
})

//////////////////////        TEXT FIELD EDITING        //////////////////////

const onFieldInput = async (field, value) => {
   try {
      extendExpiration()
      await updateUser(props.user_uid, { [field]: value })
      displaySnackbar({ text: "Modification effectuée avec succès !", color: 'success', timeout: 2000 })
   } catch(err) {
      displaySnackbar({ text: "Erreur lors de la sauvegarde...", color: 'error', timeout: 4000 })
   }
}
const onFieldInputDebounced = useDebounceFn(onFieldInput, 500)


//////////////////////        USER-TAB RELATIONS        //////////////////////

const onTabChange = async (tabs) => {
   try {
      const [toAddTabs, toRemoveRelationUIDs] = await tabDifference(props.user_uid, tabs)
      for (const tab of toAddTabs) {
         await createUserTabRelation({ user_uid: props.user_uid, tab })
      }
      for (const relation_uid of toRemoveRelationUIDs) {
         await removeUserTabRelation(relation_uid)
      }
      displaySnackbar({ text: "Modification effectuée avec succès !", color: 'success', timeout: 2000 })
   } catch(err) {
      displaySnackbar({ text: "Erreur lors de l'enregistrement...", color: 'error', timeout: 4000 })
   }
}


//////////////////////        USER-GROUP RELATIONS        //////////////////////

const onGroupChange = async (groupUIDs) => {
   try {
      const [toAddGroupUIDs, toRemoveRelationUIDs] = await groupDifference(props.user_uid, groupUIDs)
      for (const group_uid of toAddGroupUIDs) {
         await createUserGroupRelation({ user_uid: props.user_uid, group_uid })
      }
      for (const relation_uid of toRemoveRelationUIDs) {
         await removeUserGroupRelation(relation_uid)
      }
      displaySnackbar({ text: "Modification effectuée avec succès !", color: 'success', timeout: 2000 })
   } catch(err) {
      displaySnackbar({ text: "Erreur lors de l'enregistrement...", color: 'error', timeout: 4000 })
   }
}


//////////////////////        AVATAR UPLOAD        //////////////////////

let avatarPath

async function onUploadStart(ev) {
   let extension = ev.detail.file.type.substring(6)
   if (extension === 'svg+xml') extension = 'svg'
   avatarPath = `avatar-${props.user_uid}.${extension}`
}

async function onUploadChunk(ev) {
   const type = ev.detail.file.type // ex: image/jpg
   if (type.startsWith('image')) {
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
   await updateUser(props.user_uid, { pict: `/static/upload/avatars/${avatarPath}` })
   displaySnackbar({ text: "Modification effectuée avec succès !", color: 'success', timeout: 2000 })
}

//////////////////////        AVATAR DISPLAY        //////////////////////

const avatarDialog = ref(false)

function onAvatarClick() {
   avatarDialog.value = true
}


async function validateEmail() {
   try {
      await app.service('auth').forgottenPassword(user.value.email)
      const text = `Des instructions viennent d'être envoyées à l'adresse '${user.value.email}'`
      displaySnackbar({ text, color: 'success', timeout: 5000 })
   } catch(err) {
      console.log('err', err)
      displaySnackbar({ text: "Erreur inconnue", color: 'error', timeout: 2000 })
   }
}
</script>
