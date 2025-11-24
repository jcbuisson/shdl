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
         <div ref="editorContainer" class="fill-height" v-if="currentDocument" style="height: 100%; width: 100%;"></div>
      </div>
   </v-card>
</template>

<script setup>
import { ref, watch, onUnmounted, onBeforeUnmount, onMounted, nextTick } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { map } from 'rxjs'

import ace from 'ace-builds'
import 'ace-builds/src-noconflict/mode-json'
import 'ace-builds/src-noconflict/theme-chrome'

import useExpressXClient from '/src/use/useExpressXClient';

import { useUserDocument } from '/src/use/useUserDocument'
import { useUserDocumentEvent } from '/src/use/useUserDocumentEvent'

const { app } = useExpressXClient();
const { getObservable: userDocuments$, update: updateUserDocument } = useUserDocument(app)
const { create: createUserDocumentEvent, update: updateUserDocumentEvent } = useUserDocumentEvent(app)


const props = defineProps({
   document_uid: {
      type: String,
   },
   editable: {
      type: Boolean,
      default: true
   },
})


// THANK YOU CLAUDE

const editorContainer = ref(null)
let editor = null
let isUpdatingFromSubscription = false

function initializeEditor() {
   if (!editor && editorContainer.value) {
      editor = ace.edit(editorContainer.value)
      editor.setTheme('ace/theme/chrome')
      editor.session.setMode('ace/mode/json')
      editor.setOptions({
         // enableBasicAutocompletion: true,
         // enableLiveAutocompletion: true,
         fontSize: 14,
         tabSize: 3,
         useSoftTabs: true,
      })

      // Listen for changes from user typing
      editor.session.on('change', () => {
         if (!isUpdatingFromSubscription) {
            const text = editor.getValue()
            if (currentDocument.value) {
               currentDocument.value.text = text
               onTextChangeDebounced(text)
            }
         }
      })
   }
}

onBeforeUnmount(() => {
   if (editor) {
      editor.destroy()
      editor = null
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
      const isNewDocument = !currentDocument.value || currentDocument.value.uid !== doc.uid

      if (isNewDocument) {
         // New document - update everything including editor content
         currentDocument.value = doc

         // Wait for DOM to update, then initialize editor if needed
         await nextTick()
         initializeEditor()

         if (editor && doc.text !== undefined) {
            isUpdatingFromSubscription = true
            editor.setValue(doc.text, -1) // -1 moves cursor to start
            isUpdatingFromSubscription = false
         }
      } else {
         // Same document - only update if text actually changed from external source
         if (currentDocument.value.text !== doc.text) {
            // External change (from another user or server)
            currentDocument.value = doc
            if (editor) {
               isUpdatingFromSubscription = true
               const cursorPos = editor.getCursorPosition()
               editor.setValue(doc.text, -1)
               editor.moveCursorToPosition(cursorPos)
               isUpdatingFromSubscription = false
            }
         } else {
            // Text is same, just update metadata
            currentDocument.value = { ...currentDocument.value, ...doc }
         }
      }

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
      analyzeSHDLDocumentDebounced(currentDocument.value)
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
const onTextChangeDebounced = useDebounceFn(onTextChange, 500);
</script>

<style>
.ace_editor .ace_active-line {
   /* Use a standard background color */
   background: #e6ffe6 !important; 
   
   /* Optional: Change border or add a shadow for emphasis */
   border-left: 3px solid #009900;
}
</style>
