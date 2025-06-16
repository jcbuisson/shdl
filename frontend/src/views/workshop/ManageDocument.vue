<template>
   <v-tabs slider-color="indigo" v-model="tab">
      <v-tab :to="{ path: `/home/${signedinUid}/workshop/${document_uid}/edit` }" router value='edit'>
         Édition
      </v-tab>
      <v-tab :to="{ path: `/home/${signedinUid}/workshop/${document_uid}/simulate` }" router value='simulate'>
         Simulation
      </v-tab>
   </v-tabs>

   <router-view></router-view>

</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
   signedinUid: {
      type: String,
   },
   document_uid: {
      type: String,
   },
})

const tab = ref()
</script>