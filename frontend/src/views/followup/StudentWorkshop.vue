<template>
   <SplitPanel :leftWidth="studentManagerWorkshopSplitWidth" @resize="onResize">
      <template v-slot:left-panel>
         <!-- makes the layout a vertical stack filling the full height -->
         <v-card class="d-flex flex-column fill-height">
            <v-toolbar color="red-darken-4" density="compact">
               <v-btn readonly icon="mdi-magnify" variant="text"></v-btn>
               <v-text-field v-model="filter" single-line></v-text-field>
            </v-toolbar>
         
            <!-- Fills remaining vertical space -->
            <div class="d-flex flex-column flex-grow-1 overflow-auto">
               <v-list-item three-line v-for="(document, index) in documentList":key="index" :value="document" @click="selectDocument(document)" :active="selectedDocument?.uid === document?.uid">
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
import { ref, watch, onUnmounted } from 'vue'
// import { useObservable } from '@vueuse/rxjs'
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

const filter = ref('')

// const documentList = useObservable(documents$({user_uid: props.user_uid}).pipe(
//    map(documents => documents.toSorted((u1, u2) => (u1.name > u2.name) ? 1 : (u1.name < u2.name) ? -1 : 0))
// ))
const documentList = ref([]);

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
