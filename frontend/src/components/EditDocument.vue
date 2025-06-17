<template>
   <!-- makes the layout a vertical stack filling the full height -->
   <v-card class="d-flex flex-column fill-height">

      <!-- Toolbar (does not grow) -->
      <div style="background-color: #67AD5B; color: white; height: 48px; padding: 10px;" class="d-flex align-center">
         <h5>Module OK, 23 équipotentielles</h5>
      </div>

      <!-- Fills remaining vertical space -->
      <div class="d-flex flex-column flex-grow-1 overflow-auto">
         <codemirror
            v-if="selectedDoc"
            v-model="selectedDoc.content"
            :extensions="selectedDoc.extensions"
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

let subscription

const uid2docDict = {}
const selectedDoc = ref({})
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
      selectedDoc.value = doc
      // restore state
      currentEditorView.value.setState(doc.state)
   } else {
      console.log('create new doc')
      const newDoc = {
         content: '',
         extensions: [myLang, EditorView.editable.of(props.editable)],
      }
      uid2docDict[uid] = newDoc
      selectedDoc.value = newDoc
   }

   // handle document content change
   if (subscription) subscription.unsubscribe()
   subscription = userDocument$(uid).subscribe(document => {
      console.log('document', document)
      selectedDoc.value.content = document.text
      selectedDocument.value = document
   })
}, { immediate: true })

onUnmounted(() => {
   subscription && subscription.unsubscribe()
})

const onChange = async (text) => {
   // console.log('onChange', text)
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
