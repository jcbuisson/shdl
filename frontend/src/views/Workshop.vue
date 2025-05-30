<template>
   <SplitPanel>
      <template v-slot:left-panel>
         <!-- makes the layout a vertical stack filling the full height -->
         <v-card class="d-flex flex-column fill-height">
            <v-toolbar color="red-darken-4" density="compact">
               <v-btn readonly icon="mdi-magnify" variant="text"></v-btn>
               <v-text-field v-model="filter" single-line></v-text-field>
               <v-btn icon="mdi-plus" variant="text" @click="addModule"></v-btn>
            </v-toolbar>
         
            <!-- Fills remaining vertical space -->
            <div class="d-flex flex-column flex-grow-1 overflow-auto">
               <v-list-item three-line v-for="(document, index) in documentList":key="index" :value="document" @click="selectDocument(document)" :active="selectedDocument?.uid === document?.uid">
                  <v-list-item-title>{{ document.name }}</v-list-item-title>
                  <v-list-item-subtitle>{{ document.type }}</v-list-item-subtitle>

                  <template v-slot:append>
                     <v-btn color="grey-lighten-1" icon="mdi-delete" variant="text" @click="deleteDocument(document)"></v-btn>
                  </template>
               </v-list-item>
            </div>
         </v-card>
      </template>

      <template v-slot:right-panel>
         <router-view></router-view>
      </template>
   </SplitPanel>

   <v-dialog v-model="addModuleDialog" max-width="400">
      <v-card title="Nouveau document">
        <v-card-text>
            <v-row dense>
               <v-col cols="12" md="12">
                  <v-text-field label="Nom" required v-model="data.name"></v-text-field>
                  <!-- <v-text-field label="Type" required v-model="data.type"></v-text-field> -->
                  <v-select
                     variant="underlined"
                     v-model="data.type"
                     :items="types"
                     item-title="name"
                     item-value="uid"
                     label="Type"
                  ></v-select>

               </v-col>
            </v-row>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn
            text="Annuler"
            variant="plain"
            @click="addModuleDialog = false"
          ></v-btn>

          <v-btn
            color="primary"
            text="OK"
            variant="tonal"
            @click="addModuleDialog = false; createDocument()"
          ></v-btn>
        </v-card-actions>
      </v-card>
   </v-dialog>

</template>


<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute} from 'vue-router'

import { addPerimeter as addUserDocumentPerimeter, create as createUserDocument, remove as removeUserDocument } from '/src/use/useUserDocument'
import router from '/src/router'

import SplitPanel from '/src/components/SplitPanel.vue'
import { displaySnackbar } from '/src/use/useSnackbar'


const props = defineProps({
   signedinUid: {
      type: String,
   },
})

const types = [
   {
      name: "Module SHDL",
      uid: 'shdl',
   },
   {
      name: "Programme CRAPS",
      uid: 'craps',
   },
   {
      name: "Document texte",
      uid: 'text',
   },
]

const filter = ref('')

const documentList = ref([])

let userDocumentPerimeter

onMounted(async () => {
   userDocumentPerimeter = await addUserDocumentPerimeter({ user_uid: props.signedinUid }, async list => {
      documentList.value = list.toSorted((u1, u2) => (u1.name > u2.name) ? 1 : (u1.name < u2.name) ? -1 : 0)
   })
})

onUnmounted(async () => {
   await userDocumentPerimeter.remove()
})

const addModuleDialog = ref(false)
const data = ref({})

async function addModule() {
   addModuleDialog.value = true
}

const selectedDocument = ref(null)

function selectDocument(module) {
   selectedDocument.value = module
   router.push(`/home/${props.signedinUid}/workshop/${module.uid}`)
}

async function createDocument() {
   const createdModule = await createUserDocument({
      user_uid: props.signedinUid,
      name: data.value.name,
      type: data.value.type,
      text: `module ${data.value.name}()\nend module`,
   })
   console.log('createdModule', createdModule)
}

async function deleteDocument(module) {
   if (window.confirm(`Supprimer le module ${module.name} ?`)) {
      try {
         await removeUserDocument(module.uid)
         router.push(`/home/${props.signedinUid}/workshop`)
         displaySnackbar({ text: "Suppression effectuée avec succès !", color: 'success', timeout: 2000 })
      } catch(err) {
         displaySnackbar({ text: "Erreur lors de la suppression...", color: 'error', timeout: 4000 })
      }
   }
}

const route = useRoute()
const routeRegex = /\/home\/([a-z0-9]+)\/workshop\/([a-z0-9]+)/

watch(() => [route.path, documentList.value], async () => {
   const match = route.path.match(routeRegex)
   if (!match) return
   const uid = match[2]
   selectedDocument.value = documentList.value.find(module => module.uid === uid)
}, { immediate: true })
</script>
