<template>
   <v-tabs slider-color="indigo" v-model="tab">
      <v-tab :to="{ path: `/home/${signedinUid}/followup/${user_uid}/activity` }" router value='activity'>
         Activité
      </v-tab>
      <v-tab :to="{ path: `/home/${signedinUid}/followup/${user_uid}/attendance` }" router value='attendance'>
         Présence
      </v-tab>
      <v-tab :to="{ path: `/home/${signedinUid}/followup/${user_uid}/workshop` }" router value='workshop'>
         Travaux
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
})

const tab = ref()
</script>