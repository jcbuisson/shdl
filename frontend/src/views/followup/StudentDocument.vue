<template>
   <codemirror
      v-if="selectedDoc"
      v-model="selectedDoc.content"
      :extensions="selectedDoc.extensions"
      placeholder="Start coding here..."
      class="fill-height"
      @ready="handleEditorReady"
   />
</template>

<script setup>
import { ref, shallowRef, watch, onUnmounted } from 'vue'
import { Codemirror } from 'vue-codemirror';
import { EditorView } from 'codemirror';
import { map } from 'rxjs'

import { myLang } from '/src/lib/mylang.js'
import { useUserDocument } from '/src/use/useUserDocument'
import { useUserDocumentEvent } from '/src/use/useUserDocumentEvent'

const { getObservable: userDocuments$, update: updateUserDocument } = useUserDocument()


const props = defineProps({
   signedinUid: {
      type: String,
   },
   document_uid: {
      type: String,
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
         extensions: [myLang, EditorView.editable.of(false)],
      }
      uid2docDict[uid] = newDoc
      selectedDoc.value = newDoc
   }

   // handle document content change
   if (subscription) subscription.unsubscribe()
   subscription = userDocument$(uid).subscribe(document => {
      console.log('document', document)
      selectedDoc.value.content = document.text
   })
}, { immediate: true })

onUnmounted(() => {
   subscription && subscription.unsubscribe()
})
</script>
