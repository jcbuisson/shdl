<template>
   <!-- makes the layout a vertical stack filling the full height -->
   <v-card class="d-flex flex-column fill-height">

      <!-- Toolbar (does not grow) -->
      <div v-if="selectedDocument?.type !== 'text'" :style="{ backgroundColor: message.inError ? '#E15241' : '#67AD5B' }" style="color: white; height: 48px; padding: 10px;" class="d-flex align-center">
         <h5>{{ message.text }}</h5>
      </div>

      <!-- Fills remaining vertical space -->
      <div class="d-flex flex-column flex-grow-1 overflow-auto">
         <!-- <codemirror
            v-if="selectedCodeMirrorDoc"
            v-model="selectedCodeMirrorDoc.content"
            :extensions="selectedCodeMirrorDoc.extensions"
            placeholder="Start coding here..."
            class="fill-height"
            @change="onChangeDebounced($event)"
            @ready="handleEditorReady"
         /> -->
         <div ref="editorContainer" class="fill-height" />
      </div>
   </v-card>
</template>

<script setup>
import { ref, shallowRef, watch, onMounted, onUnmounted, onBeforeUnmount } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { EditorView } from 'codemirror'
import { useDebounceFn } from '@vueuse/core'
import { map } from 'rxjs'

import { keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap } from '@codemirror/commands'


import { myLang } from '/src/lib/mylang.js'
import { useUserDocument } from '/src/use/useUserDocument'
import { useUserDocumentEvent } from '/src/use/useUserDocumentEvent'
import { shdlDocumentParsing$ } from '/src/lib/businessObservables'
import { checkModuleMap } from '/src/lib/shdl/shdlAnalyzer'
import { useSHDLModule } from '/src/use/useSHDLModule'

const { getObservable: userDocuments$, update: updateUserDocument } = useUserDocument()
const { create: createUserDocumentEvent, update: updateUserDocumentEvent } = useUserDocumentEvent()

const { addOrUpdateModule } = useSHDLModule()


const props = defineProps({
   signedinUid: String,
   user_uid: String,
   document_uid: String,
})

const editorContainer = ref(null)
let view = null


onBeforeUnmount(() => {
   if (view) {
      view.destroy()
   }
})


const currentEditorView = shallowRef()
const handleEditorReady = (payload) => {
   console.log('ready', payload)
   currentEditorView.value = payload.view
}

const message = ref({})

let subscription
let subscription2

const selectedDocument = ref()

let updateUid

function userDocument$(uid) {
   return userDocuments$({ uid }).pipe(
      map(documents => documents.length > 0 ? documents[0] : null)
   )
}

watch(() => props.document_uid, async (uid, previous_uid) => {
   console.log('new editor')

   if (view) {
      view.destroy()
   }
   const state = EditorState.create({
      // doc: code.value,
      extensions: [
         keymap.of(defaultKeymap),
         // javascript(),
         EditorView.updateListener.of((update) => {
            if (update.changes) {
               // code.value = update.state.doc.toString()
            }
         })
      ]
   })
   view = new EditorView({
      state,
      parent: editorContainer.value
   })

   // handle document content change
   if (subscription) subscription.unsubscribe()
   subscription = userDocument$(uid).subscribe(async doc => {
      console.log('xxx', doc)
      forceUpdateCode(doc.text)

      if (doc.type === 'shdl') {
         handleSHDLDocumentChange(doc)
      }
   })

}, { immediate: true })

onUnmounted(() => {
   subscription && subscription.unsubscribe()
   subscription2 && subscription2.unsubscribe()
})

function forceUpdateCode(newValue) {
   const pos = view.state.selection.main.head
   view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: newValue },
      selection: { anchor: pos },
   })
}

const onChange = async (text) => {
   forceUpdateCode(text)

   if (selectedDocument.value.type === 'shdl') {
      handleSHDLDocumentChange(selectedDocument.value)
   }
   // save document
   await updateUserDocument(props.document_uid, {
      text,
      update_count: selectedDocument.value.update_count + 1,
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
const onChangeDebounced = useDebounceFn(onChange, 500)

// analyze SHDL module and extract its equipotentials
function handleSHDLDocumentChange(doc) {
   if (subscription2) subscription2.unsubscribe()
   // observe SHDL module and its submodules recursively from `doc` root and return an unordered list of module structures
   subscription2 = shdlDocumentParsing$(props.user_uid, doc.name).subscribe({
      next: syntaxStructureList => {
         console.log('next edit', syntaxStructureList)
         // transform the list of syntaxic structures into a map of modules
         const moduleMap = syntaxStructureList.reduce((accu, syntaxStructure) => {
            const moduleName = syntaxStructure.name
            const module = {
               document_uid: doc.uid,
               name: moduleName,
               structure: syntaxStructure,
               equipotentials: [],
               submoduleNames: syntaxStructure.instances.filter(instance => instance.type === 'module_instance').map(instance => instance.name),
            }
            accu[moduleName] = module
            return accu
         }, {})

         // analyze the map of modules
         // return the main error and an ordered list of modules, leaves first and root last
         const { err, moduleList } = checkModuleMap(moduleMap)
         console.log('err', err)
         console.log('moduleList', moduleList)

         // save modules in Indexedb (asynchronous)
         for (const module of moduleList) {
            addOrUpdateModule(module)
         }
         // display status
         const rootModule = moduleList[moduleList.length - 1]
         if (err) {
            displayErrorMessageSHDL(err, rootModule.name)
         } else {
            displayOKMessageSHDL(rootModule)
         }
      },

      error: err => {
         console.log('err22', err.documentUID, err.moduleName, err.location, err.message)
         displayErrorMessageSHDL(err, doc.name)
         addOrUpdateModule({
            document_uid: err.documentUID,
            name: err.moduleName,
            structure: null,
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
