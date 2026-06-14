<template>
   <v-card class="d-flex flex-column fill-height overflow-hidden">
      <v-form class="test-editor-form overflow-hidden">
         <v-container fluid class="test-editor-layout overflow-hidden">

            <v-row>
               <v-col cols="12" md="6">
                  <v-text-field
                     label="Nom"
                     :modelValue="test?.name"
                     @input="(e) => onFieldInputDebounced('name', e.target.value)"
                     variant="underlined"
                  ></v-text-field>
               </v-col>
               <v-col cols="12" md="3">
                  <v-select
                     label="Type"
                     :model-value="test?.type"
                     :items="['shdl', 'craps']"
                     @update:modelValue="value => onFieldInputDebounced('type', value)"
                     variant="underlined"
                  ></v-select>
               </v-col>
               <v-col cols="12" md="2">
                  <v-text-field
                     type="number"
                     label="Coefficient"
                     :modelValue="test?.weight"
                     @input="(e) => onFieldInputDebounced('weight', parseInt(e.target.value))"
                     variant="underlined"
                  ></v-text-field>
               </v-col>
            </v-row>

            <div class="editor-section d-flex flex-column">
               <v-tabs v-model="editorTab" density="compact" slider-color="indigo" class="mb-3 flex-shrink-0">
                  <v-tab value="statements">Directives de test</v-tab>
                  <v-tab value="memory">Contenu des mémoires</v-tab>
               </v-tabs>

               <div class="editor-pane flex-grow-1">
                  <div v-show="editorTab === 'statements'" class="editor-pane-item">
                     <div ref="statementsEditorContainer" class="code-editor"></div>
                  </div>
                  <div v-show="editorTab === 'memory'" class="editor-pane-item">
                     <div ref="memoryEditorContainer" class="code-editor"></div>
                  </div>
               </div>
            </div>

         </v-container>
      </v-form>
   </v-card>
</template>

<script setup>
import { ref, watch, onUnmounted, nextTick } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { Observable, from, map, of, merge, combineLatest, firstValueFrom } from 'rxjs'

import ace from 'ace-builds'
import 'ace-builds/src-noconflict/mode-json'
import 'ace-builds/src-noconflict/theme-chrome'
import '/src/lib/shdl/shdlAceMode.js'
import '/src/lib/craps/crapsAceMode.js'

import useExpressXClient from '/src/use/useExpressXClient';

import { useSHDLTest } from '/src/use/useSHDLTest'
import { displaySnackbar } from '/src/use/useSnackbar'

const { app } = useExpressXClient();
const { getObservable: tests$, update: updateTest } = useSHDLTest(app);


const props = defineProps({
   test_uid: {
      type: String,
   },
})

const test = ref()
const editorTab = ref('statements')
const statementsEditorContainer = ref(null)
const memoryEditorContainer = ref(null)

let testSubscription
let statementsEditor = null
let memoryEditor = null
let isUpdatingFromSubscription = false

function test$(test_uid) {
   return tests$({ uid: test_uid }).pipe(
      map(tests => tests.length > 0 ? tests[0] : null)
   )
}

function statementModeForType(type) {
   return type === 'craps' ? 'ace/mode/craps' : 'ace/mode/shdl'
}

function initializeEditors() {
   if (!statementsEditor && statementsEditorContainer.value) {
      statementsEditor = ace.edit(statementsEditorContainer.value)
      statementsEditor.setTheme('ace/theme/chrome')
      statementsEditor.session.setMode(statementModeForType(test.value?.type))
      statementsEditor.setOptions({
         fontSize: 14,
         tabSize: 3,
         useSoftTabs: true,
      })
      statementsEditor.session.on('change', () => {
         if (!isUpdatingFromSubscription) {
            onFieldInputDebounced('test_statements', statementsEditor.getValue(), { silent: true })
         }
      })
   }

   if (!memoryEditor && memoryEditorContainer.value) {
      memoryEditor = ace.edit(memoryEditorContainer.value)
      memoryEditor.setTheme('ace/theme/chrome')
      memoryEditor.session.setMode('ace/mode/json')
      memoryEditor.setOptions({
         fontSize: 14,
         tabSize: 3,
         useSoftTabs: true,
      })
      memoryEditor.session.on('change', () => {
         if (!isUpdatingFromSubscription) {
            onFieldInputDebounced('memory_contents', memoryEditor.getValue(), { silent: true })
         }
      })
   }
}

function syncEditorsFromTest() {
   if (!test.value) return
   if (statementsEditor) {
      statementsEditor.session.setMode(statementModeForType(test.value.type))
      const nextText = test.value.test_statements ?? ''
      if (statementsEditor.getValue() !== nextText) {
         isUpdatingFromSubscription = true
         statementsEditor.setValue(nextText, -1)
         isUpdatingFromSubscription = false
      }
   }
   if (memoryEditor) {
      const nextText = test.value.memory_contents ?? ''
      if (memoryEditor.getValue() !== nextText) {
         isUpdatingFromSubscription = true
         memoryEditor.setValue(nextText, -1)
         isUpdatingFromSubscription = false
      }
   }
}

onUnmounted(() => {
   testSubscription && testSubscription.unsubscribe()
   if (statementsEditor) {
      statementsEditor.destroy()
      statementsEditor = null
   }
   if (memoryEditor) {
      memoryEditor.destroy()
      memoryEditor = null
   }
})

watch(() => props.test_uid, async (test_uid) => {
   testSubscription = test$(test_uid).subscribe(tst => {
      test.value = tst
   })
}, { immediate: true })

watch(() => test.value, async () => {
   await nextTick()
   initializeEditors()
   syncEditorsFromTest()
}, { immediate: true, deep: true })

watch(() => test.value?.type, () => {
   if (statementsEditor) {
      statementsEditor.session.setMode(statementModeForType(test.value?.type))
   }
})

watch(() => editorTab.value, async () => {
   await nextTick()
   statementsEditor?.resize()
   memoryEditor?.resize()
})


//////////////////////        TEXT FIELD EDITING        //////////////////////

const onFieldInput = async (field, value, { silent = false } = {}) => {
   try {
      await updateTest(props.test_uid, { [field]: value })
      if (!silent) {
         displaySnackbar({ text: "Modification effectuée avec succès !", color: 'success', timeout: 2000 })
      }
   } catch(err) {
      displaySnackbar({ text: "Erreur lors de la sauvegarde...", color: 'error', timeout: 4000 })
   }
}
const onFieldInputDebounced = useDebounceFn(onFieldInput, 500)
</script>

<style scoped>
.editor-label {
   margin-bottom: 8px;
   font-weight: 600;
}

.code-editor {
   width: 100%;
   height: 100%;
   min-height: 320px;
   border: 1px solid rgba(0, 0, 0, 0.12);
   border-radius: 4px;
   overflow: hidden;
}

.editor-section {
   min-height: 0;
}

.editor-pane {
   min-height: 0;
}

.editor-pane-item {
   height: 100%;
   min-height: 0;
}

.test-editor-form {
   height: 100%;
   min-height: 0;
}

.test-editor-layout {
   height: 100%;
   min-height: 0;
   display: grid;
   grid-template-rows: auto minmax(0, 1fr);
   align-items: stretch;
}
</style>
