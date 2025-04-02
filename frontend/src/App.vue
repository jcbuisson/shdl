<template>
   <ReloadPrompt></ReloadPrompt>

   <router-view></router-view>

   <v-snackbar v-model="snackbar.visible" :timeout="snackbar.timeout" :color="snackbar.color">
      {{ snackbar.text }}
   </v-snackbar>

</template>

<script setup>
import ReloadPrompt from '/src/components/ReloadPrompt.vue'
import { snackbar } from '/src/use/useSnackbar'
</script>
