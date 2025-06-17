<template>
   <v-tabs slider-color="indigo" v-model="tab">
      <v-tab :to="{ path: `/home/${signedinUid}/followup/${user_uid}/workshop/${document_uid}/edit` }" router value='edit'>
         Édition
      </v-tab>
      <v-tab :to="{ path: `/home/${signedinUid}/followup/${user_uid}/workshop/${document_uid}/simulate` }" router value='simulate'>
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
   user_uid: {
      type: String,
   },
   document_uid: {
      type: String,
   },
})

const tab = ref()
</script>