<script setup lang="ts">
/// <reference types="vite-plugin-pwa/vue" />
import { useRegisterSW } from 'virtual:pwa-register/vue'

// check new version every 10s
const { offlineReady, needRefresh, updateServiceWorker, } = useRegisterSW({
   onRegistered(r) {
      r && setInterval(() => {
         r.update()
      }, 10000)
   }
})
</script>

<template>
   <div v-if="needRefresh" class="pwatoast">
      Une nouvelle version est disponible <a href="#" class="pwatoast-text" @click="updateServiceWorker">installer</a>
   </div>
</template>

<style>
.pwatoast {
   position: fixed;
   bottom: 0px;
   right: 0px;
   margin: 1rem /* 16px */;
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