<template>
   <SplitPanel :leftWidth="workshopSplitWidth" @resize="onResize">
      <template v-slot:left-panel>
         <!-- makes the layout a vertical stack filling the full height -->
         <div class="d-flex flex-column fill-height">

            <!-- Filter by name (does not grow) -->
            <v-toolbar color="red-darken-4" ddensity="compact">
               <v-text-field v-model="nameFilter" label="Recherche par nom..." class="px-2" single-line clearable></v-text-field>
               <v-btn icon="mdi-plus" variant="text" @click="addDocument"></v-btn>
            </v-toolbar>
         
            <!-- Fills remaining vertical space -->
            <div class="d-flex flex-column flex-grow-1 overflow-auto">
               <v-list-item three-line v-for="(document, index) in filteredSortedDocumentList":key="index" :value="document" @click="selectDocument(document)" :active="selectedDocument?.uid === document?.uid">
                  <v-list-item-title>{{ document.name }}</v-list-item-title>
                  <v-list-item-subtitle>{{ document.type }}</v-list-item-subtitle>

                  <template v-slot:append>
                     <v-btn color="grey-lighten-1" icon="mdi-delete" variant="text" @click="deleteDocument(document)"></v-btn>
                  </template>
               </v-list-item>
            </div>
         </div>
      </template>

      <template v-slot:right-panel>
         <router-view></router-view>
      </template>
   </SplitPanel>

   <v-dialog v-model="addDocumentDialog" max-width="400">
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
            @click="addDocumentDialog = false"
          ></v-btn>

          <v-btn
            color="primary"
            text="OK"
            variant="tonal"
            @click="addDocumentDialog = false; createDocument()"
          ></v-btn>
        </v-card-actions>
      </v-card>
   </v-dialog>

</template>


<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute} from 'vue-router'
import { v7 as uuidv7 } from 'uuid'
import { useObservable } from '@vueuse/rxjs'
import { map } from 'rxjs'

import { useUserDocument } from '/src/use/useUserDocument'

import router from '/src/router'
import { app } from '/src/client-app.js'
import { setWorkshopSplitWidth, workshopSplitWidth } from "/src/use/useAppState"


import SplitPanel from '/src/components/SplitPanel.vue'
import { displaySnackbar } from '/src/use/useSnackbar'

const { getObservable: documents$, create: createUserDocument, remove: removeUserDocument } = useUserDocument()


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

const nameFilter = ref('')

const sortedDocumentList = useObservable(documents$({user_uid: props.signedinUid}).pipe(
   map(documents => documents.toSorted((u1, u2) => (u1.name > u2.name) ? 1 : (u1.name < u2.name) ? -1 : 0))
))
const filteredSortedDocumentList = computed(() => {
   if (!sortedDocumentList.value) return []
   const nameFilter_ = (nameFilter.value || '').toLowerCase()
   return sortedDocumentList.value.filter(doc => {
      if (nameFilter_.length === 0) return true
      if (doc.name.toLowerCase().indexOf(nameFilter_) > -1) return true
      return false
   })
})

const addDocumentDialog = ref(false)
const data = ref({})

async function addDocument() {
   data.value = {}
   addDocumentDialog.value = true
}

const selectedDocument = ref(null)

function selectDocument(module) {
   selectedDocument.value = module
   if (module.type === 'shdl') {
      router.push(`/home/${props.signedinUid}/workshop/shdl/${module.uid}`)
   } else if (module.type === 'text') {
      router.push(`/home/${props.signedinUid}/workshop/text/${module.uid}`)
   } else if (module.type === 'craps') {
      router.push(`/home/${props.signedinUid}/workshop/craps/${module.uid}`)
   }
}

async function createDocument() {
   const createdDocument = await createUserDocument({
      user_uid: props.signedinUid,
      name: data.value.name,
      type: data.value.type,
      text: `module ${data.value.name}()\nend module`,
   })
   const uid = uuidv7()
   app.service('user_document_event').create({
      data: {
         uid,
         document_uid: createdDocument.uid,
         type: 'create',
         start: new Date(),
      }
   })
}

async function deleteDocument(module) {
   if (window.confirm(`Supprimer le module ${module.name} ?`)) {
      try {

         // TODO: SUPPRIMER LES EVENTS

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

watch(() => [route.path, sortedDocumentList.value], async () => {
   if (!sortedDocumentList.value) return
   const match = route.path.match(routeRegex)
   if (!match) return
   const uid = match[2]
   selectedDocument.value = sortedDocumentList.value.find(module => module.uid === uid)
}, { immediate: true })

function onResize(width) {
   setWorkshopSplitWidth(width)
}
</script>
