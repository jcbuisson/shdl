<template>
   <SplitPanel :leftWidth="studentManagerWorkshopSplitWidth" @resize="onResize">
      <template v-slot:left-panel>
         <!-- makes the layout a vertical stack filling the full height -->
         <v-card class="d-flex flex-column fill-height">
            <div class="d-flex flex-column bg-red-darken-4">
               <div class="d-flex align-center">
                  <v-btn-toggle v-model="typeFilter" density="compact" class="mx-2" style="flex-shrink: 0; background: transparent">
                     <v-btn value="shdl" size="small" variant="text" rounded="lg"
                        :style="typeFilter === 'shdl' ? 'background: white; color: #b71c1c; font-weight: bold' : 'color: white'">SHDL</v-btn>
                     <v-btn value="craps" size="small" variant="text" rounded="lg"
                        :style="typeFilter === 'craps' ? 'background: white; color: #b71c1c; font-weight: bold' : 'color: white'">CRAPS</v-btn>
                     <v-btn value="text" size="small" variant="text" rounded="lg"
                        :style="typeFilter === 'text' ? 'background: white; color: #b71c1c; font-weight: bold' : 'color: white'">Texte</v-btn>
                  </v-btn-toggle>
               </div>
               <v-text-field
                  v-model="nameFilter"
                  label="Recherche par nom..."
                  class="px-2 pb-2"
                  single-line
                  clearable
                  hide-details
                  density="compact"
                  variant="solo-filled"
               ></v-text-field>
            </div>
         
            <!-- Fills remaining vertical space -->
            <div class="d-flex flex-column flex-grow-1 overflow-auto">
               <v-list-item three-line v-for="document in filteredDocumentList" :key="document.uid" :value="document" @click="selectDocument(document)" :active="selectedDocument?.uid === document?.uid">
                  <v-list-item-title>{{ document.name }}</v-list-item-title>
                  <v-list-item-subtitle>{{ document.type }}</v-list-item-subtitle>

                  <template v-slot:append>
                     <v-tooltip text="Nombre de sauvegardes">
                        <template v-slot:activator="{ props }">
                           <v-badge v-bind="props" :color="document.update_count > 15 ? 'grey' : 'red'" inline :content="document.update_count"></v-badge>
                        </template>
                     </v-tooltip>
                  </template>
               </v-list-item>
            </div>
         </v-card>
      </template>

      <template v-slot:right-panel>
         <router-view></router-view>
      </template>
   </SplitPanel>

</template>


<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { map } from 'rxjs'

import useExpressXClient from '/src/use/useExpressXClient';

import { useUserDocument } from '/src/use/useUserDocument'

import { setStudentManagerWorkshopSplitWidth, studentManagerWorkshopSplitWidth } from "/src/use/useAppState"
import router from '/src/router'

import SplitPanel from '/src/components/SplitPanel.vue'

const { app } = useExpressXClient();
const { getObservable: documents$ } = useUserDocument(app)


const props = defineProps({
   signedinUid: {
      type: String,
   },
   user_uid: {
      type: String,
   },
})

const nameFilter = ref('')
const typeFilter = useLocalStorage('student_workshop_selected_type', 'shdl')

const documentList = ref([]);
const filteredDocumentList = computed(() => {
   const normalizedName = (nameFilter.value || '').toLowerCase()
   return documentList.value.filter(document => {
      if (typeFilter.value && document.type !== typeFilter.value) return false
      return normalizedName.length === 0 || document.name.toLowerCase().includes(normalizedName)
   })
})

let documentListSubscription;

watch(() => props.user_uid, async (user_uid) => {
   if (documentListSubscription) documentListSubscription.unsubscribe()
   documentListSubscription = documents$({user_uid}).pipe(
      map(documents => documents.toSorted((u1, u2) => (u1.name > u2.name) ? 1 : (u1.name < u2.name) ? -1 : 0))
   ).subscribe(docList => {
      documentList.value = docList;
   })
},
   { immediate: true } // so that it's called on component mount
)

onUnmounted(() => {
   if (documentListSubscription) documentListSubscription.unsubscribe()
})

const selectedDocument = ref(null)

function selectDocument(document) {
   selectedDocument.value = document
   if (document.type === 'shdl') {
      router.push(`/home/${props.signedinUid}/followup/${props.user_uid}/workshop/shdl/${document.uid}`)
   } else if (document.type === 'text') {
      router.push(`/home/${props.signedinUid}/followup/${props.user_uid}/workshop/text/${document.uid}`)
   } else if (document.type === 'craps') {
      router.push(`/home/${props.signedinUid}/followup/${props.user_uid}/workshop/craps/${document.uid}`)
   }
}

function onResize(width) {
   setStudentManagerWorkshopSplitWidth(width)
}
</script>
