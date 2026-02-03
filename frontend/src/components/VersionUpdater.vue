<script setup lang="ts">
/// <reference types="vite-plugin-pwa/vue" />
import { useRegisterSW } from "virtual:pwa-register/vue";
import { watch } from "vue";

// check new version every 10s
const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW({
   onRegistered(r) {
      r &&
         setInterval(() => {
            r.update();
         }, 10000);
   },
});

// Automatically update when new version is available
watch(needRefresh, (value) => {
   if (value) {
      console.log("🔄 New version available, updating automatically...");
      updateServiceWorker(true); // true = reload page after update
   }
});
</script>

<template>
   <!-- Optional: Show a subtle notification that update is happening -->
   <!-- Remove or comment out if you want completely silent updates -->
   <div v-if="needRefresh" class="pwatoast">
      Mise à jour en cours...
   </div>
</template>

<style>
.pwatoast {
   position: fixed;
   bottom: 0px;
   right: 0px;
   margin: 3rem /* 16px */;
   padding: 1rem /* 16px */;
   color: rgba(0, 0, 0, 0.662);
   background-color: #dcfce7;
   border-style: solid;
   border-radius: 0.25rem /* 4px */;
   border-color: #dcfce7;
   z-index: 50;
}
.pwatoast-text {
   color: #60a5fa;
   margin-left: 0.5rem /* 8px */;
}
.pwatoast-text:hover {
   text-decoration-line: underline;
}
</style>
