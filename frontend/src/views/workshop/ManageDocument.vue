<template>
   <!-- makes the layout a vertical stack filling the full height -->
   <div class="d-flex flex-column fill-height">

      <!-- Toolbar (does not grow) -->
      <v-tabs slider-color="indigo" v-if="userDocument?.type !== 'text'">
         <v-tab :to="{ path: `/home/${signedinUid}/workshop/${document_uid}/edit` }" router value='edit'>
            Édition
         </v-tab>
         <v-tab :to="{ path: `/home/${signedinUid}/workshop/${document_uid}/simulate` }" router value='simulate'>
            Simulation
         </v-tab>
      </v-tabs>

      <!-- Fills remaining vertical space -->
      <div class="d-flex flex-column flex-grow-1 overflow-auto">
         <router-view></router-view>
      </div>
   </div>
</template>

<script setup>
import { ref, watch } from 'vue'

import { useUserDocument } from '/src/use/useUserDocument'

const { findByUID } = useUserDocument()

const props = defineProps({
   signedinUid: {
      type: String,
   },
   document_uid: {
      type: String,
   },
})

const userDocument = ref()
watch(() => props.document_uid, async (uid) => {
   userDocument.value = await findByUID(uid)
})
</script>