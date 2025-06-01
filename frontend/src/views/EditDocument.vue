<template>
   <codemirror
      v-if="selectedDoc"
      v-model="selectedDoc.content"
      :extensions="selectedDoc.extensions"
      :autodestroy="true"
      placeholder="Start coding here..."
      class="fill-height"
      @change="onChangeDebounced($event)"
      @ready="handleEditorReady"
   />
</template>

<script setup>
import { ref, shallowRef, watch, onUnmounted } from 'vue'
import { Codemirror } from 'vue-codemirror';
import { useDebounceFn } from '@vueuse/core'
import { javascript } from '@codemirror/lang-javascript'
import { history } from '@codemirror/commands'
import { myLangSupport } from "/src/lib/shdl"

import { addPerimeter as addUserDocumentPerimeter, update as updateUserDocument } from '/src/use/useUserDocument'

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

let perimeter

const uid2docDict = {}
const selectedDoc = ref({})

// DOES STATE INCLUDE HISTORY?

watch(() => props.document_uid, async (uid, previous_uid) => {
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
         // extensions: [javascript(), history()]
         extensions: [javascript()],
         // extensions: [myLangSupport()],
      }
      uid2docDict[uid] = newDoc
      selectedDoc.value = newDoc
   }

   // handle document content change
   if (perimeter) await perimeter.remove()
   perimeter = await addUserDocumentPerimeter({ uid }, ([document]) => {
      console.log('document', document)
      selectedDoc.value.content = document.text
   })
}, { immediate: true })

onUnmounted(async () => {
   await perimeter.remove()
})

const onChange = async (text) => {
   console.log('onChange', text)
   await updateUserDocument(props.document_uid, { text })
}

const onChangeDebounced = useDebounceFn(onChange, 500)
</script>
