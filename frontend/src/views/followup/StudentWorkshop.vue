<template>
   <SplitPanel>
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
                     <v-badge :color="document.update_count > 50 ? 'grey' : 'red'" inline :content="document.update_count"></v-badge>
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
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute} from 'vue-router'
import { useObservable } from '@vueuse/rxjs'
import { map } from 'rxjs'

import { useUserDocument } from '/src/use/useUserDocument'
import router from '/src/router'

import SplitPanel from '/src/components/SplitPanel.vue'
import { displaySnackbar } from '/src/use/useSnackbar'

const { getObservable: documents$ } = useUserDocument()


const props = defineProps({
   signedinUid: {
      type: String,
   },
   user_uid: {
      type: String,
   },
})

const filter = ref('')

const documentList = useObservable(documents$({user_uid: props.user_uid}).pipe(
   map(documents => documents.toSorted((u1, u2) => (u1.name > u2.name) ? 1 : (u1.name < u2.name) ? -1 : 0))
))

const addModuleDialog = ref(false)
const data = ref({})

async function addModule() {
   addModuleDialog.value = true
}

const selectedDocument = ref(null)

function selectDocument(document) {
   selectedDocument.value = document
   router.push(`/home/${props.signedinUid}/followup/${props.user_uid}/workshop/${document.uid}`)
}

// const route = useRoute()
// const routeRegex = /\/home\/([a-z0-9]+)\/workshop\/([a-z0-9]+)/

// watch(() => [route.path, documentList.value], async () => {
//    const match = route.path.match(routeRegex)
//    if (!match) return
//    const uid = match[2]
//    selectedDocument.value = documentList.value.find(document => document.uid === uid)
// }, { immediate: true })
</script>
