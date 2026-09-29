<template>
   <v-card class="documentation d-flex flex-column flex-grow-1">
      <v-tabs :model-value="topic" slider-color="indigo" class="flex-shrink-0">
         <v-tab
            v-for="subject in ['shdl', 'craps']"
            :key="subject"
            :value="subject"
            :to="`/home/${signedinUid}/documentation/${subject}`"
         >
            {{ subject.toUpperCase() }}
         </v-tab>
      </v-tabs>
      <iframe
         :key="topic"
         :src="`${baseUrl}documentation/${topic}.html`"
         :title="`Documentation ${topic.toUpperCase()}`"
         class="documentation-page flex-grow-1"
         @load="enableDocumentationCopy"
      />
   </v-card>
</template>

<script setup>
import { onUnmounted } from 'vue'
import { installSessionClipboardSource } from '/src/lib/sessionClipboardGuard'

defineProps({
   signedinUid: { type: String, required: true },
   topic: { type: String, default: 'shdl' },
})

const baseUrl = import.meta.env.BASE_URL

let removeClipboardSource
function enableDocumentationCopy(event) {
   removeClipboardSource?.()
   const page = event.target.contentDocument
   if (!page) return
   removeClipboardSource = installSessionClipboardSource(page, () => page.getSelection()?.toString())
}

onUnmounted(() => removeClipboardSource?.())
</script>

<style scoped>
.documentation {
   min-height: 0;
}

.documentation-page {
   width: 100%;
   min-height: 0;
   border: 0;
   background: white;
}
</style>
