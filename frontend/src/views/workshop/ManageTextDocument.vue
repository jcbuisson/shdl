<template>
   <!-- makes the layout a vertical stack filling the full height -->
   <v-card class="d-flex flex-column fill-height">
      <!-- Fills remaining vertical space -->
      <div class="d-flex flex-column flex-grow-1 overflow-auto">
         <div ref="editorContainer" class="fill-height" v-if="currentDocument">
            <v-ace-editor
               v-model:value="onChangeDebounced.text"
               @update:value="onChangeDebounced"
               lang="json" 
               theme="chrome" 
               style="height: 100%; width: 100%;"
               :options="{
                  enableBasicAutocompletion: true,
                  enableLiveAutocompletion: true,
                  fontSize: 13,
                  tabSize: 3, 
                  useSoftTabs: true,
               }"
            />
         </div>
      </div>
   </v-card>
</template>

<script setup>
import { ref, shallowRef, watch, onUnmounted } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { map } from 'rxjs'

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

const currentEditorView = shallowRef()
const handleEditorReady = (payload) => {
   console.log('ready', payload)
   currentEditorView.value = payload.view
}

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
         extensions: [EditorView.editable.of(props.editable)],
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
   })

}, { immediate: true })

onUnmounted(() => {
   subscription && subscription.unsubscribe()
   subscription2 && subscription2.unsubscribe()
})

const onChange = async (text) => {
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
</script>
