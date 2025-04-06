<template>
   <v-card>
      <v-form v-model="valid" lazy-validation>
         <v-container>
            <v-row>
               <v-col cols="12" md="6">
                  <v-text-field
                     label="email"
                     v-model="data.email"
                     :rules="emailRules"
                     variant="underlined"
                  ></v-text-field>
               </v-col>
               <v-col cols="12" md="6">
                  <div style="display: flex; width: 100%; justify-content: space-between; align-items: center; gap: 10px;">
                     <v-avatar size="80" @click="onAvatarClick(data)">
                        <v-img :src="data?.pict"></v-img>
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
                     v-model="data.lastname"
                     variant="underlined"
                  ></v-text-field>
               </v-col>
               <v-col cols="12" md="6">
                  <v-text-field
                     label="Prénom"
                     v-model="data.firstname"
                     variant="underlined"
                  ></v-text-field>
               </v-col>
            </v-row>

            <v-row>
               <v-col xs="12" md="12">
                  <v-select
                     variant="underlined"
                     v-model="data.tabs"
                     :items="tabs"
                     item-title="name"
                     item-value="uid"
                     label="Onglets"
                     chips
                     multiple
                     :rules="tabsRules"
                  ></v-select>
               </v-col>
            </v-row>

            <v-row>
               <v-col xs="12" md="12">
                  <v-select
                     variant="underlined"
                     v-model="data.groups"
                     :items="groupList"
                     item-title="name"
                     item-value="uid"
                     label="Groupes"
                     chips
                     multiple
                  ></v-select>
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
import { ref, onMounted, onUnmounted } from 'vue'
import { firstValueFrom } from 'rxjs'

import { findMany as findManyUser, create as createUser } from '/src/use/useUser'
import { findMany as findManyGroup } from '/src/use/useGroup'
import { updateUserTabs } from '/src/use/useUserTabRelation'
import { updateUserGroups } from '/src/use/useUserGroupRelation'
import { extendExpiration } from "/src/use/useAuthentication"

import router from '/src/router'
import { displaySnackbar } from '/src/use/useSnackbar'
import { tabs } from '/src/use/useTabs'

import 'jcb-upload'


const props = defineProps({
   signedinUid: {
      type: String,
   },
})

const data = ref({})

const valid = ref()

const emailRules = [
   (v) => !!v || "L'email est obligatoire",
   (v) => /^([a-z0-9_.-]+)@([\da-z.-]+)\.([a-z.]{2,6})$/.test(v) || "L'email doit être valide"
]

const tabsRules = [
   (v) => !!v && Object.keys(v).length > 0 || "Choisir au moins un onglet"
]

const groupList = ref([])
let subscription

onMounted(async () => {
   const groupListObservable = await findManyGroup({})
   subscription = groupListObservable.subscribe(list => {
      groupList.value = list.toSorted((u1, u2) => (u1.name > u2.name) ? 1 : (u1.name < u2.name) ? -1 : 0)
   })
})

onUnmounted(() => {
   subscription.unsubscribe()
})

async function submit() {
   try {
      extendExpiration()
      // check if email is not already used
      const [other] = await firstValueFrom(await findManyUser({ email: data.value.email }))
      if (other) {
         alert(`Il existe déjà un utilisateur avec cet email : ${data.value.email}`)
      } else {
         const user = await createUser({
            email: data.value.email,
            firstname: data.value.firstname,
            lastname: data.value.lastname,
         })
         await updateUserTabs(user.uid, data.value.tabs)
         await updateUserGroups(user.uid, data.value.groups)
         displaySnackbar({ text: "Création effectuée avec succès !", color: 'success', timeout: 2000 })
         router.push(`/home/${props.signedinUid}/users/${user.uid}`)
      }
   } catch(err) {
      displaySnackbar({ text: "Erreur lors de la création...", color: 'error', timeout: 4000 })
   }
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