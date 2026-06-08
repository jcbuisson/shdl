<template>
   <!-- makes the layout a vertical stack filling the full height -->
   <v-card class="d-flex flex-column fill-height">

      <!-- Status bar -->
      <div class="d-flex align-center"
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
import { ref, watch, onBeforeUnmount, onUnmounted, nextTick } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { map } from 'rxjs'

import ace from 'ace-builds'
import 'ace-builds/src-noconflict/theme-chrome'

import useExpressXClient from '/src/use/useExpressXClient'
import { useUserDocument } from '/src/use/useUserDocument'
import { useUserDocumentEvent } from '/src/use/useUserDocumentEvent'
import { checkModule } from '/src/lib/craps/crapsChecker.js'
import { useCRAPSAssembly } from '/src/use/useCRAPSAssembly'

const { app } = useExpressXClient()
const { getObservable: userDocuments$, update: updateUserDocument } = useUserDocument(app)
const { create: createUserDocumentEvent, update: updateUserDocumentEvent } = useUserDocumentEvent(app)
const { setAssembly } = useCRAPSAssembly()

const props = defineProps({
   signedinUid: String,
   user_uid: String,
   document_uid: String,
   readonly: Boolean,
})

const editorContainer = ref(null)
let editor = null
let isUpdatingFromSubscription = false

function initializeEditor() {
   if (!editor && editorContainer.value) {
      editor = ace.edit(editorContainer.value)
      editor.setTheme('ace/theme/chrome')
      editor.session.setMode('ace/mode/text')
      editor.setOptions({
         fontSize: 14,
         tabSize: 3,
         useSoftTabs: true,
      })
      editor.setReadOnly(props.readonly ?? false)

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

const message = ref({ inError: false, text: '' })
const currentDocument = ref()
let updateUid
let subscription

function userDocument$(uid) {
   return userDocuments$({ uid }).pipe(
      map(documents => documents.length > 0 ? documents[0] : null)
   )
}

watch(() => props.document_uid, async (uid) => {
   if (subscription) subscription.unsubscribe()
   subscription = userDocument$(uid).subscribe(async doc => {
      if (!doc) return
      const isNewDocument = !currentDocument.value || currentDocument.value.uid !== doc.uid

      if (isNewDocument) {
         currentDocument.value = doc
         await nextTick()
         initializeEditor()
         if (editor && doc.text !== undefined) {
            isUpdatingFromSubscription = true
            editor.setValue(doc.text, -1)
            isUpdatingFromSubscription = false
         }
      } else {
         if (currentDocument.value.text !== doc.text) {
            currentDocument.value = doc
            if (editor) {
               isUpdatingFromSubscription = true
               const cursorPos = editor.getCursorPosition()
               editor.setValue(doc.text, -1)
               editor.moveCursorToPosition(cursorPos)
               isUpdatingFromSubscription = false
            }
         } else {
            currentDocument.value = { ...currentDocument.value, ...doc }
         }
      }

      assembleCRAPSDocument(doc)
   })
}, { immediate: true })

onUnmounted(() => {
   subscription && subscription.unsubscribe()
})

function assembleCRAPSDocument(doc) {
   const result = checkModule({ text: doc.text || '' })
   if (result.errorMsg) {
      message.value = { inError: true, text: result.errorMsg }
      setAssembly(props.document_uid, { memory: null, symbols: null, errorMsg: result.errorMsg })
   } else {
      const wordCount = Object.keys(result.memory).length
      message.value = { inError: false, text: `Programme OK, ${wordCount} mot${wordCount > 1 ? 's' : ''}` }
      setAssembly(props.document_uid, { memory: result.memory, symbols: result.symbols, errorMsg: null })
   }
}

const assembleCRAPSDocumentDebounced = useDebounceFn(assembleCRAPSDocument, 500)

async function onTextChange(text) {
   assembleCRAPSDocumentDebounced(currentDocument.value)
   await updateUserDocument(props.document_uid, {
      text,
      update_count: currentDocument.value.update_count + 1,
   })
   if (updateUid) {
      await updateUserDocumentEvent(updateUid, { end: new Date() })
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
</script>
