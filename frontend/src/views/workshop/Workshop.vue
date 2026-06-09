<template>
   <SplitPanel :leftWidth="workshopSplitWidth" @resize="onResize">
      <template v-slot:left-panel>
         <!-- makes the layout a vertical stack filling the full height -->
         <div class="d-flex flex-column fill-height">

            <!-- Filter by name (does not grow) -->
            <v-toolbar color="red-darken-4">
               <v-text-field v-model="nameFilter" label="Recherche par nom..." class="px-2" single-line clearable hide-details></v-text-field>
               <v-btn-toggle v-model="typeFilter" density="compact" class="mx-2" style="flex-shrink: 0; background: transparent">
                  <v-btn value="shdl" size="small" variant="text" rounded="lg"
                     :style="typeFilter === 'shdl' ? 'background: white; color: #b71c1c; font-weight: bold' : 'color: white'">SHDL</v-btn>
                  <v-btn value="craps" size="small" variant="text" rounded="lg"
                     :style="typeFilter === 'craps' ? 'background: white; color: #b71c1c; font-weight: bold' : 'color: white'">CRAPS</v-btn>
                  <v-btn value="text" size="small" variant="text" rounded="lg"
                     :style="typeFilter === 'text' ? 'background: white; color: #b71c1c; font-weight: bold' : 'color: white'">Texte</v-btn>
               </v-btn-toggle>
               <v-btn icon="mdi-plus" variant="text" @click="addDocument"></v-btn>
            </v-toolbar>
         
            <!-- Fills remaining vertical space -->
            <div class="d-flex flex-column flex-grow-1 overflow-auto">

                  <v-list-item three-line v-for="(document, index) in filteredSortedDocumentList" :key="index"
                        :value="document"
                        @click="selectDocument(document)"
                        :active="selectedDocument?.uid === document?.uid">
                     <template v-slot:prepend>
                        <v-btn :color="documentColor(document)"
                           :icon="documentIcon(document)" variant="text"
                        ></v-btn>
                     </template>

                     <v-list-item-title>{{ document.name }}</v-list-item-title>
                     <v-list-item-subtitle>{{ document.type }}</v-list-item-subtitle>

                     <template v-slot:append>
                        <v-btn v-if="document.type !== 'shdl'" color="grey-lighten-1" icon="mdi-pencil" variant="text" @click.stop="openRenameDialog(document)"></v-btn>
                        <v-btn color="grey-lighten-1" icon="mdi-delete" variant="text" @click.stop="deleteDocument(document)"></v-btn>
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
                  <v-text-field label="Nom" required v-model="data.name" autofocus @keyup.enter="data.name && (addDocumentDialog = false, createDocument())"></v-text-field>
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
            :disabled="!data.name"
            @click="addDocumentDialog = false; createDocument()"
          ></v-btn>
        </v-card-actions>
      </v-card>
   </v-dialog>

   <v-dialog v-model="renameDialog" max-width="400">
      <v-card title="Renommer le document">
        <v-card-text>
            <v-text-field label="Nom" required v-model="renameData.name" autofocus @keyup.enter="renameDialog = false; renameDocument()"></v-text-field>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text="Annuler" variant="plain" @click="renameDialog = false"></v-btn>
          <v-btn color="primary" text="OK" variant="tonal" :disabled="!renameData.name" @click="renameDialog = false; renameDocument()"></v-btn>
        </v-card-actions>
      </v-card>
   </v-dialog>

</template>


<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { useRoute} from 'vue-router'
import { v7 as uuidv7 } from 'uuid'
import { useObservable } from '@vueuse/rxjs'
import { map } from 'rxjs'

import useExpressXClient from '/src/use/useExpressXClient';

import { useUserDocument } from '/src/use/useUserDocument'
import { useUserDocumentEvent } from '/src/use/useUserDocumentEvent'
import { useSHDLModule } from '/src/use/useSHDLModule'

import router from '/src/router'
import { setWorkshopSplitWidth, workshopSplitWidth } from "/src/use/useAppState"

import SplitPanel from '/src/components/SplitPanel.vue'
import { displaySnackbar } from '/src/use/useSnackbar'

const { app } = useExpressXClient();
const { getObservable: documents$, create: createUserDocument, update: updateUserDocument, remove: removeUserDocument } = useUserDocument(app)
const { create: createUserDocumentEvent } = useUserDocumentEvent(app)
const { modules$, addOrUpdateModule } = useSHDLModule(app)


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
const typeFilter = useLocalStorage('shdl_selected_type', 'shdl')

const sortedDocumentList = useObservable(documents$({user_uid: props.signedinUid}).pipe(
   map(documents => documents.toSorted((u1, u2) => (u1.name > u2.name) ? 1 : (u1.name < u2.name) ? -1 : 0))
))

const filteredSortedDocumentList = computed(() => {
   if (!sortedDocumentList.value) return []
   const nameFilter_ = (nameFilter.value || '').toLowerCase()
   return sortedDocumentList.value.filter(doc => {
      if (typeFilter.value && doc.type !== typeFilter.value) return false
      if (nameFilter_.length === 0) return true
      if (doc.name.toLowerCase().indexOf(nameFilter_) > -1) return true
      return false
   })
})

// undefined, true, false
const shdlDocumentStatus = computed(() => (doc) => {
   if (doc.type !== 'shdl') return
   const module = moduleList.value.find(module => module.document_uid === doc.uid)
   if (!module) return
   return module?.is_valid
})

const documentIcon = computed(() => (document) => {
   if (document.type === 'shdl') {
      const status = shdlDocumentStatus.value(document)
      return status === undefined ? '': status ? 'mdi-check' : 'mdi-close'
   }
   if (document.type === 'craps') {
      return ''
   }
   return ''
})

const documentColor = computed(() => (document) => {
   if (document.type === 'shdl') {
      const status = shdlDocumentStatus.value(document)
      return status === undefined ? '': status ? 'green' : 'red'
   }
   if (document.type === 'craps') {
      return 'orange'
   }
   return 'white'
})

const moduleList = useObservable(modules$())

const addDocumentDialog = ref(false)
const data = ref({})

async function addDocument() {
   data.value = { type: typeFilter.value || 'shdl' }
   addDocumentDialog.value = true
}

const renameDialog = ref(false)
const renameData = ref({})

function openRenameDialog(document) {
   renameData.value = { uid: document.uid, name: document.name }
   renameDialog.value = true
}

async function renameDocument() {
   try {
      await updateUserDocument(renameData.value.uid, { name: renameData.value.name })
   } catch(err) {
      displaySnackbar({ text: "Erreur lors du renommage...", color: 'error', timeout: 4000 })
   }
}

const selectedDocument = ref(null)

function selectDocument(document) {
   selectedDocument.value = document
   if (document.type === 'shdl') {
      // const module = moduleList.value.find(module => module.document_uid === document.uid)
      addOrUpdateModule({
         document_uid: document.uid,
         is_valid: null,
      })
   }
   router.push(`/home/${props.signedinUid}/workshop/${document.type}/${document.uid}`);
}

async function createDocument() {
   typeFilter.value = data.value.type
   const text = data.value.type === 'shdl' ? `module ${data.value.name}()\nend module` : '';
   const document = await createUserDocument({
      user_uid: props.signedinUid,
      name: data.value.name,
      type: data.value.type,
      text,
   });
   const uid = uuidv7();
   await createUserDocumentEvent({
      data: {
         uid,
         document_uid: document.uid,
         type: 'create',
         start: new Date(),
      }
   });
   selectDocument(document);
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
