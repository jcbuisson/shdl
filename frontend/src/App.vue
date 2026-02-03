<template>
   <VersionUpdater></VersionUpdater>

   <router-view></router-view>

   <v-snackbar v-model="snackbar.visible" :timeout="snackbar.timeout" :color="snackbar.color">
      {{ snackbar.text }}
   </v-snackbar>

</template>

<script setup>
import VersionUpdater from '/src/components/VersionUpdater.vue'
import { snackbar } from '/src/use/useSnackbar'

// const myWorker = new Worker(new URL("/src/worker.js", import.meta.url), { type: 'module' });
// myWorker.onmessage = (e) => {
//    console.log("Message received from worker", e.data);
// };
// myWorker.postMessage({
//    code: 'signin'
// });
// setInterval(() => {
//    myWorker.postMessage({ a: 1, b: 2 });
// }, 2000);

</script>
