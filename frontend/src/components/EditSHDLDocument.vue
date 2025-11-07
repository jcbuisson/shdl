<template>
   <!-- makes the layout a vertical stack filling the full height -->
   <v-card class="d-flex flex-column fill-height">

      <!-- Toolbar (does not grow) -->
      <div v-if="currentDocument?.type === 'shdl'"
            class="d-flex align-center"
            :style="{ backgroundColor: message.inError ? '#E15241' : '#67AD5B' }"
            style="color: white; height: 48px; padding: 10px;">
         <h5>{{ message.text }}</h5>
      </div>

      <!-- Fills remaining vertical space -->
      <div class="d-flex flex-column flex-grow-1 overflow-auto">
         <div class="fill-height" v-if="currentDocument">
            <v-ace-editor
               v-model:value="currentDocument.text"
               @update:value="onTextChangeDebounced"
               lang="json" 
               theme="chrome" 
               style="height: 100%; width: 100%;"
               :options="{
                  enableBasicAutocompletion: true,
                  enableLiveAutocompletion: true,
                  fontSize: 14,
                  tabSize: 3, 
                  useSoftTabs: true,
               }"
            />
         </div>
      </div>
   </v-card>
</template>

<script setup>
import { ref, watch, onUnmounted, onBeforeUnmount } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { map } from 'rxjs'

import { VAceEditor } from 'vue3-ace-editor';
import 'ace-builds/src-noconflict/mode-json'; // Example: JSON language mode
import 'ace-builds/src-noconflict/theme-chrome'; // Example: Chrome theme

import router from '/src/router'

import useExpressXClient from '/src/use/useExpressXClient';

import { useUserDocument } from '/src/use/useUserDocument'
import { useUserDocumentEvent } from '/src/use/useUserDocumentEvent'
import { useBusinessObservables } from '/src/use/useBusinessObservables'
import { checkModuleMap } from '/src/lib/shdl/shdlAnalyzer'
import { useSHDLModule } from '/src/use/useSHDLModule'

const { app } = useExpressXClient();
const { getObservable: userDocuments$, update: updateUserDocument } = useUserDocument(app)
const { create: createUserDocumentEvent, update: updateUserDocumentEvent } = useUserDocumentEvent(app)
const { shdlDocumentParsing$ } = useBusinessObservables(app)

const { addOrUpdateModule } = useSHDLModule()


const props = defineProps({
   signedinUid: String,
   user_uid: String,
   document_uid: String,
})

let view = null

onBeforeUnmount(() => {
   if (view) {
      view.destroy()
   }
})

const message = ref({})

let subscription
let subscription2

const currentDocument = ref()

let updateUid

function userDocument$(uid) {
   return userDocuments$({ uid }).pipe(
      map(documents => documents.length > 0 ? documents[0] : null)
   )
}

watch(() => props.document_uid, async (uid, previous_uid) => {
   if (subscription) subscription.unsubscribe()
   subscription = userDocument$(uid).subscribe(async doc => {
      // handle document content change
      currentDocument.value = doc

      if (doc.type === 'shdl') {
         analyzeSHDLDocument(doc)
      }
   })

}, { immediate: true })

onUnmounted(() => {
   subscription && subscription.unsubscribe()
   subscription2 && subscription2.unsubscribe()
})

async function onTextChange(text) {
   if (currentDocument.value.type === 'shdl') {
      analyzeSHDLDocument(currentDocument.value)
   }
   // save document
   await updateUserDocument(props.document_uid, {
      text,
      update_count: currentDocument.value.update_count + 1,
   })
   // create or update document event
   if (updateUid) {
      await updateUserDocumentEvent(updateUid, {
         end: new Date(),
      })
   } else {
      const updateEvent = await createUserDocumentEvent({
         document_uid: props.document_uid,
         type: 'update',
         start: new Date(),
         end: new Date(),
      })
      updateUid = updateEvent.uid
   }
}
const onTextChangeDebounced = useDebounceFn(onTextChange, 500)

// analyze SHDL module and extract its equipotentials
function analyzeSHDLDocument(doc) {
   if (subscription2) subscription2.unsubscribe()
   // observe SHDL module and its submodules recursively from `doc` root and return an unordered list of module structures
   subscription2 = shdlDocumentParsing$(props.user_uid, doc.name).subscribe({
      next: async (syntaxStructureList) => {
         console.log('next edit', syntaxStructureList)
         // transform the list of syntaxic structures into a map of modules
         const moduleMap = syntaxStructureList.reduce((accu, syntaxStructure) => {
            const moduleName = syntaxStructure.name
            const module = {
               name: moduleName,
               document_uid: syntaxStructure.document_uid,
               document_name: syntaxStructure.document_name,
               structure: syntaxStructure,
               equipotentials: [],
               submoduleNames: syntaxStructure.instances.filter(instance => instance.type === 'module_instance').map(instance => instance.name),
            }
            accu[moduleName] = module
            return accu
         }, {})

         // analyze the map of modules
         // return the main error and an ordered list of modules, leaves first and root last
         const { err, moduleList } = await checkModuleMap(moduleMap)
         console.log('err', err)
         console.log('moduleList', moduleList)

         // save modules in Indexedb (no need to await)
         for (const module of moduleList) {
            addOrUpdateModule(module)
         }
         // for valid modules, rename document if it's not module's name
         for (const module of moduleList) {
            if (!module.is_valid) continue
            if (module.name === module.document_name) continue
            await updateUserDocument(module.document_uid, { name: module.name })
         }
         
         const rootModule = moduleList.at(-1)

         if (err) {
            // display error
            displayErrorMessageSHDL(err, rootModule.name)
         } else {
            // display success
            displayOKMessageSHDL(rootModule)
            // add simulator
            router.push(`/home/${props.signedinUid}/workshop/shdl/${doc.uid}`)
         }
      },

      error: err => {
         console.log('err22', err)
         console.log('loc', err.getModuleName)
         displayErrorMessageSHDL(err, doc.name)
         addOrUpdateModule({
            document_uid: err.documentUID,
            is_valid: false,
         })
      },
   })
}

function displayOKMessageSHDL(rootModule) {
   message.value = { inError: false, text: `Module OK, ${rootModule.equipotentials.length} équipotentielles` }
}

function displayErrorMessageSHDL(err, currentModuleName) {
   const locationStr = err.location ? `L ${err.location.start.line}, col ${err.location.start.column}` : null
   if (currentModuleName === err.moduleName) {
      if (locationStr) {
         message.value = { inError: true, text: `${locationStr} : ${err.message}` }
      } else {
         message.value = { inError: true, text: err.message }
      }
   } else {
      if (locationStr) {
         message.value = { inError: true, text: `Module ${err.moduleName}, ${locationStr} : ${err.message}` }
      } else {
         message.value = { inError: true, text: `Module ${err.moduleName}: ${err.message}` }
      }
   }
}
</script>
