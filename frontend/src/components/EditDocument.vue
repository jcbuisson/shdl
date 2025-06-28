<template>
   <!-- makes the layout a vertical stack filling the full height -->
   <v-card class="d-flex flex-column fill-height">

      <!-- Toolbar (does not grow) -->
      <div :style="{ backgroundColor: message.err ? '#E15241' : '#67AD5B' }" style="color: white; height: 48px; padding: 10px;" class="d-flex align-center">
         <h5>{{ message.text }}</h5>
      </div>

      <!-- Fills remaining vertical space -->
      <div class="d-flex flex-column flex-grow-1 overflow-auto">
         <codemirror
            v-if="selectedCodeMirrorDoc"
            v-model="selectedCodeMirrorDoc.content"
            :extensions="selectedCodeMirrorDoc.extensions"
            placeholder="Start coding here..."
            class="fill-height"
            @change="onChangeDebounced($event)"
            @ready="handleEditorReady"
         />
      </div>
   </v-card>
</template>

<script setup>
import { ref, shallowRef, watch, onUnmounted } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { EditorView } from 'codemirror'
import { useDebounceFn } from '@vueuse/core'
import { map } from 'rxjs'

import { myLang } from '/src/lib/mylang.js'
import { useUserDocument } from '/src/use/useUserDocument'
import { useUserDocumentEvent } from '/src/use/useUserDocumentEvent'
import { shdlDocumentParsing$ } from '/src/lib/businessObservables'
import { useObservable } from '@vueuse/rxjs'

const { getObservable: userDocuments$, update: updateUserDocument } = useUserDocument()
const { create: createUserDocumentEvent, update: updateUserDocumentEvent } = useUserDocumentEvent()


const props = defineProps({
   document_uid: {
      type: String,
   },
   editable: {
      type: Boolean,
      default: true
   },
})

const currentEditorView = shallowRef()
const handleEditorReady = (payload) => {
   console.log('ready', payload)
   currentEditorView.value = payload.view
}

const message = ref({})

let subscription
let subscription2

const uid2docDict = {}
const selectedCodeMirrorDoc = ref({})
const selectedDocument = ref()

let updateUid

function userDocument$(uid) {
   return userDocuments$({ uid }).pipe(
      map(documents => documents.length > 0 ? documents[0] : null)
   )
}

watch(() => props.document_uid, async (uid, previous_uid) => {
   updateUid = undefined
   if (previous_uid) {
      const previousDoc = uid2docDict[previous_uid]
      // preserve state
      previousDoc.state = currentEditorView.value?.state
   }
   const doc = uid2docDict[uid]
   if (doc) {
      selectedCodeMirrorDoc.value = doc
      // restore state
      currentEditorView.value.setState(doc.state)
   } else {
      console.log('create new doc')
      const newDoc = {
         content: '',
         extensions: [myLang, EditorView.editable.of(props.editable)],
      }
      uid2docDict[uid] = newDoc
      selectedCodeMirrorDoc.value = newDoc
   }

   // handle document content change
   if (subscription) subscription.unsubscribe()
   subscription = userDocument$(uid).subscribe(async document => {
      console.log('document', document)
      selectedCodeMirrorDoc.value.content = document.text
      selectedDocument.value = document

      if (document.type === 'shdl') {
         handleSHDLDocumentChange(document)
      }
   })

}, { immediate: true })

onUnmounted(() => {
   subscription && subscription.unsubscribe()
   subscription2 && subscription2.unsubscribe()
})

function handleSHDLDocumentChange(document) {
   if (subscription2) subscription2.unsubscribe()
   subscription2 = shdlDocumentParsing$(document.name).subscribe({
      next: val => {
         console.log('next', val)
         message.value = { err: null, text: "OK"}
      },
      error: err => {
         console.log('err', err)
         message.value = { err, text: err.message }
      },
   })
}

const onChange = async (text) => {
   // console.log('onChange', text)

   if (selectedDocument.value.type === 'shdl') {
      handleSHDLDocumentChange(selectedDocument.value)
   }

   await updateUserDocument(props.document_uid, {
      text,
      update_count: selectedDocument.value.update_count + 1,
   })

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
</script>
