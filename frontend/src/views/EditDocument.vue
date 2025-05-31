<template>
    <div class="tabs">
      <button
        v-for="docType in docTypes"
        :key="docType.id"
        @click="selectDoc(docType.id)"
        :class="{ active: selectedDocId === docType.id }"
      >
        {{ docType.name }}
      </button>
    </div>

    <div class="editor-container">
      <codemirror
        v-if="selectedDoc"
        v-model="selectedDoc.content"
        :extensions="selectedDoc.extensions"
        placeholder="Start coding here..."
        :style="{ height: '400px', border: '1px solid #ddd' }"
      />
    </div>

    <div class="output">
      <h3>Current Content ({{ selectedDoc ? selectedDoc.name : 'None' }}):</h3>
      <pre>{{ selectedDoc ? selectedDoc.content : 'Select a document to see its content.' }}</pre>
    </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { Codemirror } from 'vue-codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { useDebounceFn } from '@vueuse/core'
// import { myLangSupport } from "/src/lib/shdl"

import { addPerimeter as addUserDocumentPerimeter, update as updateUserDocument } from '/src/use/useUserDocument'

const props = defineProps({
   signedinUid: {
      type: String,
   },
   document_uid: {
      type: String,
   },
})

let perimeter

const uid2docDict = {}
const selectedDoc = ref({
   content: "Yo!"
})

watch(() => props.document_uid, async (uid, previous_uid) => {
   if (perimeter) await perimeter.remove()
   perimeter = await addUserDocumentPerimeter({ uid }, ([document]) => {
      console.log('document', document)
      const doc = uid2docDict[uid]
      if (doc) {
         selectedDoc.value = doc
      } else {
         console.log('create new doc')
         const newDoc = {
            content: document.text,
            selection: null,
         }
         uid2docDict[uid] = newDoc
         selectedDoc.value = newDoc
      }
   })
}, { immediate: true })

onUnmounted(async () => {
   await perimeter.remove()
})

// const selectedDocId = ref('html') // Initially selected document

// const docTypes = [
//    {
//       id: 'html',
//       name: 'HTML',
//       content: '<h1>Hello, Vue CodeMirror!</h1>\n<p>This is an HTML example.</p>',
//       extensions: [html()],
//    },
//    {
//       id: 'css',
//       name: 'CSS',
//       content: 'body {\n  font-family: sans-serif;\n  color: #333;\n}',
//       extensions: [css()],
//    },
//    {
//       id: 'js',
//       name: 'JavaScript',
//       content: 'console.log("This is a JavaScript example.");\nconst a = 10;\nconst b = 20;\nconsole.log(a + b);',
//       extensions: [javascript()],
//    },
// ]

// const selectedDoc = computed(() => {
//    return docTypes.find(doc => doc.id === selectedDocId.value);
// })

// function selectDoc(id) {
//    selectedDocId.value = id;
// }
</script>

<style scoped>
.tabs {
  margin-bottom: 20px;
}

.tabs button {
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  padding: 10px 15px;
  cursor: pointer;
  margin: 0 5px;
  border-radius: 5px;
  transition: background-color 0.3s ease;
}

.tabs button:hover {
  background-color: #e0e0e0;
}

.tabs button.active {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
}

.editor-container {
  margin-bottom: 20px;
}

.output {
  text-align: left;
  background-color: #f8f8f8;
  border: 1px solid #eee;
  padding: 15px;
  border-radius: 5px;
  white-space: pre-wrap; /* Ensures line breaks are respected */
}

.output h3 {
  margin-top: 0;
  color: #555;
}
</style>