<template>
   <!-- https://github.com/surmon-china/vue-codemirror -->
   <codemirror
      v-model="code"
      placeholder="Code goes here..."
      class="fill-height"
      :autofocus="true"
      :indent-with-tab="true"
      :tab-size="3"
      :extensions="extensions"
      @ready="handleReady"
      @change="onChangeDebounced($event)"
      @focus="onFocus($event)"
      @blur="onBlur($event)"
   />
</template>

<script setup>
import { ref, shallowRef, watch, onUnmounted } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { EditorState } from '@codemirror/state'
import { basicSetup } from 'codemirror'
import { history } from '@codemirror/commands'
import { oneDark } from '@codemirror/theme-one-dark'
import { useDebounceFn } from '@vueuse/core'
import { myLangSupport } from "/src/lib/shdl"

import { addPerimeter as addUserShdlModulePerimeter, update as updateUserShdlModule } from '/src/use/useUserShdlModule'

const props = defineProps({
   signedinUid: {
      type: String,
   },
   module_uid: {
      type: String,
   },
})

const code = ref('')
const extensions = [javascript()/*, oneDark*/, basicSetup, history(), myLangSupport()]

// Codemirror EditorView instance ref
const view = shallowRef()
const handleReady = (payload) => {
   view.value = payload.view
}

const userShdlModule = ref()

let perimeter

watch(() => props.module_uid, async (uid) => {
   if (perimeter) await perimeter.remove()
   perimeter = await addUserShdlModulePerimeter({ uid }, ([module]) => {
      // change editor's content
      console.log('module', module)
      userShdlModule.value = module
      code.value = module.text

      // create a new state with a new history so that undo/redo works properly
      const newState = EditorState.create({
         doc: module.text,
         extensions: [
            basicSetup,
            history(), // Re-initialize history
            myLangSupport(),
         ]
      })
      view.value.setState(newState)
   })
}, { immediate: true })

onUnmounted(async () => {
   await perimeter.remove()
})

// Status is available at all times via Codemirror EditorView
const getCodemirrorStates = () => {
   const state = view.value.state
   const ranges = state.selection.ranges
   const selected = ranges.reduce((r, range) => r + range.to - range.from, 0)
   const cursor = ranges[0].anchor
   const length = state.doc.length
   const lines = state.doc.lines
   // more state info ...
   // return ...
}

const onChange = async (text) => {
   console.log('onChange', text)
   await updateUserShdlModule(props.module_uid, { text })
}

const onChangeDebounced = useDebounceFn(onChange, 500)

const onFocus = (ev) => {
   console.log('onFocus', ev)
}

const onBlur = (ev) => {
   console.log('onBlur', ev)
}
</script>