<template>
   <!-- makes the layout a vertical stack filling the full height -->
   <v-card class="d-flex flex-column fill-height">

      <!-- Toolbar (does not grow) -->
      <v-tabs slider-color="indigo" v-model="tab">
         <v-tab :to="{ path: `/home/${signedinUid}/followup/${user_uid}/workshop/${document_uid}/edit` }" router value='edit'>
            Édition
         </v-tab>
         <v-tab :to="{ path: `/home/${signedinUid}/followup/${user_uid}/workshop/${document_uid}/simulate` }" router value='simulate'>
            Simulation
         </v-tab>
      </v-tabs>

      <!-- Fills remaining vertical space -->
      <div class="d-flex flex-column flex-grow-1 overflow-auto">
         <router-view></router-view>
      </div>
   </v-card>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
   signedinUid: {
      type: String,
   },
   user_uid: {
      type: String,
   },
   document_uid: {
      type: String,
   },
})

const tab = ref()
</script>
